const { Attendance, Event, sequelize } = require('../models');

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

        // Create new attendance request
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
            additional_instructor_name: additional_instructor_name ? additional_instructor_name.trim() : null,
            attended: false // Default to false
        });

        await sequelize.transaction(async (t) => {
            // Create new attendance request within the transaction
            const newAttendanceRequest = await Attendance.create({
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
                additional_instructor_name: additional_instructor_name ? additional_instructor_name.trim() : null,
                attended: false // Default to false
            }, { transaction: t });

            // Recalculate and update attendees count within the same transaction
            const attendanceCount = await Attendance.count({
                where: { event_id: parseInt(event_id) },
                transaction: t
            });

            await event.update({
                attendees: String(attendanceCount)
            }, { transaction: t });

            // The original response logic is now inside the transaction callback
            res.status(201).json({
                success: true,
                message: 'Attendance request submitted successfully',
                data: newAttendanceRequest
            });
        });

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

    } catch (error) {
        console.error('Error submitting attendance request:', error);
        console.error('Error details:', {
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
        const queryOptions = {
            where: whereClause,
            include: [{
                model: Event,
                as: 'event',
                attributes: ['event_id', 'name', 'date']
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

        const attendanceRequests = await Attendance.findAll(queryOptions);

        res.json({
            success: true,
            data: attendanceRequests,
            count: attendanceRequests.length,
            filters: {
                event_id,
                attended,
                search
            }
        });
    } catch (error) {
        console.error('Error fetching attendance requests:', error);
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
                attributes: ['event_id', 'name', 'date', 'description']
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
        console.error('Error fetching attendance request:', error);
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
        console.error('Error updating attendance request:', error);
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
        try {
            const event = await Event.findByPk(eventId);
            if (event) {
                // Count remaining attendance requests for this event
                const attendanceCount = await Attendance.count({
                    where: { event_id: eventId }
                });

                // Update the event's attendees field with the count as a string
                await event.update({
                    attendees: String(attendanceCount)
                });
            }
        } catch (updateError) {
            // Log error but don't fail the request if attendees update fails
            console.error('Error updating attendees count:', updateError);
        }

        res.json({
            success: true,
            message: 'Attendance request deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting attendance request:', error);
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
    deleteAttendanceRequest
};

