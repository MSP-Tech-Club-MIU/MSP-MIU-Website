const { Attendance, Event, sequelize } = require('../models');
const { parsePagination, paginationMeta } = require('../utils/pagination');
const { checkBlacklist } = require('../utils/blacklistCheck');
const logger = require('../utils/logger');

/**
 * Helper function to update the attendees count in the events table
 * @param {number} eventId - The event ID to update
 * @param {object} transaction - Optional Sequelize transaction
 */
const updateEventAttendeesCount = async (eventId, transaction = null) => {
    try {
        const event = await Event.findByPk(eventId, { transaction });
        if (!event) {
            logger.warn(`Event ${eventId} not found when updating attendees count`);
            return;
        }

        // Count total attendance requests for this event
        const attendanceCount = await Attendance.count({
            where: { event_id: eventId },
            transaction
        });

        // Update the event's attendees field with the count as a string
        await event.update({
            attendees: String(attendanceCount)
        }, { transaction });
    } catch (updateError) {
        // Log error but don't fail the request if attendees update fails
        logger.error('Error updating attendees count:', updateError);
    }
};

// Submit new attendance request
const createAttendanceRequest = async (req, res) => {
    try {
        const {
            event_id,
            full_name,
            phone_number,
            university_id,
            course_code,
            lecture_lab_time,
            room,
            instructor_name,
            additional_course_code,
            additional_lecture_lab_time,
            additional_room,
            additional_instructor_name
        } = req.body;

        // Validation - required fields
        if (!event_id || !full_name || !phone_number || !university_id) {
            return res.status(400).json({ 
                success: false,
                error: 'Missing required fields: event_id, full_name, phone_number, and university_id are required' 
            });
        }

        // Check if student is blacklisted
        const blacklistStatus = await checkBlacklist({
            name: full_name,
            university_id,
            phone_number
        });

        if (blacklistStatus.isBlacklisted) {
            return res.status(403).json({
                success: false,
                error: `Attendance request rejected: You are restricted from participating in club activities. Reason: ${blacklistStatus.reason}`
            });
        }

        // Validate event exists and registration is enabled
        const event = await Event.findByPk(event_id);
        if (!event) {
            return res.status(404).json({
                success: false,
                error: 'Event not found'
            });
        }

        // Check if registration is enabled for this event
        if (event.registration_enabled === false) {
            return res.status(403).json({
                success: false,
                error: 'Registration for this event is currently closed'
            });
        }

        await sequelize.transaction(async (t) => {
            // Check if user has already registered for this event (by university_id)
            const existingRegistration = await Attendance.findOne({
                where: {
                    event_id: parseInt(event_id),
                    university_id: university_id.trim()
                },
                transaction: t
            });

            if (existingRegistration) {
                throw new Error('You have already registered for this event');
            }

            // Create new attendance request within the transaction
            // Note: 'attended' field will default to false from the database/model
            const attendanceRequest = await Attendance.create({
                event_id: parseInt(event_id),
                full_name: full_name.trim(),
                phone_number: phone_number.trim(),
                university_id: university_id.trim(),
                course_code: course_code ? course_code.trim() : null,
                lecture_lab_time: lecture_lab_time ? lecture_lab_time.trim() : null,
                room: room ? room.trim() : null,
                instructor_name: instructor_name ? instructor_name.trim() : null,
                additional_course_code: additional_course_code ? additional_course_code.trim() : null,
                additional_lecture_lab_time: additional_lecture_lab_time ? additional_lecture_lab_time.trim() : null,
                additional_room: additional_room ? additional_room.trim() : null,
                additional_instructor_name: additional_instructor_name ? additional_instructor_name.trim() : null
                // attended defaults to false from database and model
            }, { transaction: t });

            // Update the attendees count in the events table within the same transaction
            await updateEventAttendeesCount(parseInt(event_id), t);

            // Return response with attendance request data
            res.status(201).json({
                success: true,
                message: 'Attendance request submitted successfully',
                data: {
                    request_id: attendanceRequest.request_id,
                    event_id: attendanceRequest.event_id,
                    full_name: attendanceRequest.full_name,
                    university_id: attendanceRequest.university_id
                }
            });
        }).catch(err => {
            if (err.message === 'You have already registered for this event') {
                return res.status(409).json({
                    success: false,
                    error: err.message
                });
            }
            throw err;
        });

    } catch (error) {
        logger.error('Error submitting attendance request:', error);
        logger.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        
        // Handle Sequelize validation errors
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({
                success: false,
                error: 'Validation error',
                details: error.errors.map(e => e.message)
            });
        }

        // Handle foreign key constraint errors
        if (error.name === 'SequelizeForeignKeyConstraintError') {
            return res.status(400).json({
                success: false,
                error: 'Invalid event_id. The event does not exist.'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Get all attendance requests (for admin use)
const getAllAttendanceRequests = async (req, res) => {
    try {
        const { event_id, attended, search } = req.query;

        // Build where clause for filtering
        const whereClause = {};
        
        if (event_id) {
            whereClause.event_id = parseInt(event_id);
        }
        
        if (attended !== undefined) {
            whereClause.attended = attended === 'true';
        }

        // Build the query options
        const { page, limit, offset } = parsePagination(req.query);
        const queryOptions = {
            where: whereClause,
            include: [{
                model: Event,
                as: 'event',
                attributes: ['event_id', 'name', 'event_date']
            }],
            order: [['created_at', 'DESC']],
            limit,
            offset,
            distinct: true
        };

        // Add text search if provided
        if (search) {
            const { Op } = require('sequelize');
            
            // Sanitize search input: trim, limit length, and escape special LIKE characters
            let sanitizedSearch = String(search).trim();
            
            // Limit search length to prevent DoS attacks
            if (sanitizedSearch.length > 100) {
                sanitizedSearch = sanitizedSearch.substring(0, 100);
            }
            
            // Escape special LIKE pattern characters (% and _) to prevent pattern injection
            // Replace % with \% and _ with \_ to treat them as literal characters
            // This prevents users from using SQL LIKE wildcards for injection attempts
            sanitizedSearch = sanitizedSearch.replace(/[%_\\]/g, (match) => {
                if (match === '\\') return '\\\\';
                return `\\${match}`;
            });
            
            // Sequelize automatically parameterizes queries, but we've sanitized the input
            // to prevent pattern-based attacks and ensure safe LIKE pattern matching
            queryOptions.where = {
                ...whereClause,
                [Op.or]: [
                    { full_name: { [Op.like]: `%${sanitizedSearch}%` } },
                    { university_id: { [Op.like]: `%${sanitizedSearch}%` } },
                    { phone_number: { [Op.like]: `%${sanitizedSearch}%` } },
                    { course_code: { [Op.like]: `%${sanitizedSearch}%` } }
                ]
            };
        }

        const { rows: attendanceRequests, count: total } = await Attendance.findAndCountAll(queryOptions);

        res.json({
            success: true,
            data: attendanceRequests,
            count: attendanceRequests.length,
            pagination: paginationMeta({ page, limit, total }),
            filters: {
                event_id,
                attended,
                search
            }
        });
    } catch (error) {
        logger.error('Error fetching attendance requests:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Get single attendance request by ID
const getAttendanceRequestById = async (req, res) => {
    try {
        const { id } = req.params;

        const attendanceRequest = await Attendance.findByPk(id, {
            include: [{
                model: Event,
                as: 'event',
                attributes: ['event_id', 'name', 'event_date', 'description']
            }]
        });

        if (!attendanceRequest) {
            return res.status(404).json({
                success: false,
                error: 'Attendance request not found'
            });
        }

        res.json({
            success: true,
            data: attendanceRequest
        });
    } catch (error) {
        logger.error('Error fetching attendance request:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Update attendance request (mark as attended)
const updateAttendanceRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { attended } = req.body;

        const attendanceRequest = await Attendance.findByPk(id);

        if (!attendanceRequest) {
            return res.status(404).json({
                success: false,
                error: 'Attendance request not found'
            });
        }

        // Update attended status
        if (attended !== undefined) {
            attendanceRequest.attended = attended;
            await attendanceRequest.save();
        }

        res.json({
            success: true,
            message: 'Attendance request updated successfully',
            data: {
                request_id: attendanceRequest.request_id,
                attended: attendanceRequest.attended
            }
        });

    } catch (error) {
        logger.error('Error updating attendance request:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Delete attendance request
const deleteAttendanceRequest = async (req, res) => {
    try {
        const { id } = req.params;

        const attendanceRequest = await Attendance.findByPk(id);

        if (!attendanceRequest) {
            return res.status(404).json({
                success: false,
                error: 'Attendance request not found'
            });
        }

        const eventId = attendanceRequest.event_id;

        await attendanceRequest.destroy();

        // Update the attendees count in the events table
        await updateEventAttendeesCount(eventId);

        res.json({
            success: true,
            message: 'Attendance request deleted successfully'
        });
    } catch (error) {
        logger.error('Error deleting attendance request:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Helper function to escape CSV cell value and handle special characters
const escapeCSV = (value) => {
    if (value === null || value === undefined) return '';
    
    // Convert to string - preserve original Unicode characters (em dashes, curly quotes, etc.)
    let cellString = String(value);
    
    // Remove or replace any control characters that might break CSV parsing
    // Keep all printable Unicode characters including special characters like:
    // - Em dashes (—), En dashes (–), Ellipsis (…)
    // - Curly quotes (" " ' ')
    // - Other Unicode punctuation and symbols
    cellString = cellString.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); // Remove control chars
    
    // Always wrap in quotes to ensure proper handling of all special characters
    // This is the safest approach for CSV - all values quoted
    // Escape any existing quotes by doubling them (CSV standard)
    const escaped = cellString.replace(/"/g, '""');
    return `"${escaped}"`;
};


// Export attendance requests to CSV
const exportAttendanceRequestsToCSV = async (req, res) => {
    try {
        const { event_id, search } = req.query;

        // Build where clause for filtering - ONLY show attended users
        const whereClause = {
            attended: true  // Only export attended users
        };
        
        if (event_id) {
            whereClause.event_id = parseInt(event_id);
        }

        // Build the query options
        const queryOptions = {
            where: whereClause,
            include: [{
                model: Event,
                as: 'event',
                attributes: ['event_id', 'name', 'event_date']
            }],
            order: [['created_at', 'DESC']]
        };

        // Add text search if provided
        if (search) {
            const { Op } = require('sequelize');
            
            // Sanitize search input: trim, limit length, and escape special LIKE characters
            let sanitizedSearch = String(search).trim();
            
            // Limit search length to prevent DoS attacks
            if (sanitizedSearch.length > 100) {
                sanitizedSearch = sanitizedSearch.substring(0, 100);
            }
            
            // Escape special LIKE pattern characters (% and _) to prevent pattern injection
            sanitizedSearch = sanitizedSearch.replace(/[%_\\]/g, (match) => {
                if (match === '\\') return '\\\\';
                return `\\${match}`;
            });
            
            queryOptions.where = {
                ...whereClause,
                [Op.or]: [
                    { full_name: { [Op.like]: `%${sanitizedSearch}%` } },
                    { university_id: { [Op.like]: `%${sanitizedSearch}%` } },
                    { phone_number: { [Op.like]: `%${sanitizedSearch}%` } },
                    { course_code: { [Op.like]: `%${sanitizedSearch}%` } }
                ]
            };
        }

        const attendanceRequests = await Attendance.findAll(queryOptions);

        // CSV headers (without Event ID and Registered Date)
        const headers = [
            'Number',
            'Full Name',
            'University ID',
            'Phone Number',
            'Event Name',
            'Course Code',
            'Lecture/Lab Time',
            'Room',
            'Instructor Name',
            'Additional Course Code',
            'Additional Lecture/Lab Time',
            'Additional Room',
            'Additional Instructor Name'
        ];

        // Convert data to CSV rows (without Event ID and Registered Date)
        const csvRows = attendanceRequests.map((request, index) => {
            const row = [
                index + 1,
                request.full_name || '',
                request.university_id || '',
                request.phone_number || '',
                request.event ? (request.event.name || '') : '',
                request.course_code || '',
                request.lecture_lab_time || '',
                request.room || '',
                request.instructor_name || '',
                request.additional_course_code || '',
                request.additional_lecture_lab_time || '',
                request.additional_room || '',
                request.additional_instructor_name || ''
            ];
            return row.map(cell => escapeCSV(cell)).join(',');
        });

        // Combine headers and rows
        const csvContent = [headers.map(h => escapeCSV(h)).join(','), ...csvRows].join('\r\n'); // Use \r\n for Windows compatibility

        // Add UTF-8 BOM for proper encoding in Excel and other CSV readers
        // BOM helps Excel recognize UTF-8 encoding and display special characters correctly
        const BOM = '\uFEFF';
        const csvWithBOM = BOM + csvContent;

        // Set response headers for CSV download with explicit UTF-8 encoding
        res.setHeader('Content-Type', 'text/csv;charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=attendance_review_${new Date().toISOString().split('T')[0]}.csv`);
        res.setHeader('Content-Encoding', 'UTF-8');
        
        // Convert to UTF-8 Buffer to ensure proper encoding
        const csvBuffer = Buffer.from(csvWithBOM, 'utf8');
        
        // Send CSV content with proper encoding
        res.send(csvBuffer);
    } catch (error) {
        logger.error('Error exporting attendance requests to CSV:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

module.exports = {
    createAttendanceRequest,
    getAllAttendanceRequests,
    getAttendanceRequestById,
    updateAttendanceRequest,
    deleteAttendanceRequest,
    exportAttendanceRequestsToCSV
};

