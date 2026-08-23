const { Event, EventFeedback } = require('../models');
const { Op } = require('sequelize');
const { parsePagination, paginationMeta } = require('../utils/pagination');
const { resolveSeasonFilter, seasonInclude, resolveSeasonIdForWrite } = require('../utils/seasonFilter');
const { logAdminAction } = require('../utils/adminNotification');
const logger = require('../utils/logger');

/**
 * Helper function to convert registration_enabled to boolean
 * Handles string "true"/"false" from forms and other types
 */
const convertToBoolean = (value, defaultValue = true) => {
    if (value === undefined) {
        return defaultValue;
    }
    if (typeof value === 'string') {
        return value.toLowerCase() === 'true';
    }
    return Boolean(value);
};

/**
 * Create a new event
 * POST /api/events
 */
const addEvent = async (req, res) => {
    try {
        const { name, description, event_date, location, category, upload_file, main_image, attendees, registration_enabled } = req.body;

        // Validation
        if (!name || !event_date || !location || !category) {
            return res.status(400).json({
                success: false,
                error: 'Required fields: name, event_date, location, and category'
            });
        }

        // Validate category
        const validCategories = ['Session', 'Workshop', 'Entertainment'];
        if (!validCategories.includes(category)) {
            return res.status(400).json({
                success: false,
                error: `Category must be one of: ${validCategories.join(', ')}`
            });
        }

        // Validate date format
        const eventDate = new Date(event_date);
        if (isNaN(eventDate.getTime())) {
            return res.status(400).json({
                success: false,
                error: 'Invalid event_date format'
            });
        }

        // Convert registration_enabled to boolean (handle string "true"/"false" from form)
        const regEnabled = convertToBoolean(registration_enabled, true);
        const season_id = await resolveSeasonIdForWrite(req.body, req.query);

        // Create new event
        // Files are stored on R2 cloud, so we only accept URLs from req.body
        const newEvent = await Event.create({
            name,
            description: description || null,
            event_date,
            location,
            category,
            upload_file: upload_file || null, // URL from R2 cloud storage
            main_image: main_image || null, // URL from R2 cloud storage
            attendees: attendees || null,
            registration_enabled: regEnabled,
            season_id
        });

        await logAdminAction(
            'event_created',
            `Created event "${newEvent.name}"`,
            req,
            'event',
            newEvent.event_id,
            newEvent.season_id
        );

        res.status(201).json({
            success: true,
            message: 'Event created successfully',
            data: newEvent
        });

    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ success: false, error: error.message });
        }
        logger.error('Error creating event:', error);
        logger.error('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        
        // Handle Sequelize validation errors
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({
                success: false,
                error: 'Validation error',
                details: error.errors.map(e => e.message)
            });
        }

        // Handle Sequelize database errors
        if (error.name === 'SequelizeDatabaseError') {
            logger.error('Database error:', error.original);
            return res.status(500).json({
                success: false,
                error: 'Database error occurred',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }

        res.status(500).json({
            success: false,
            error: 'Failed to create event',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Get all events
 * GET /api/events
 */
const getAllEvents = async (req, res) => {
    try {
        const { category, upcoming, past } = req.query;
        const { page, limit, offset } = parsePagination(req.query);

        const seasonFilter = await resolveSeasonFilter(req.query);
        // Build where clause
        const where = { ...seasonFilter.where };
        
        if (category) {
            where.category = category;
        }
        
        if (upcoming === 'true') {
            where.event_date = {
                [Op.gte]: new Date()
            };
        }
        
        if (past === 'true') {
            where.event_date = {
                [Op.lt]: new Date()
            };
        }

        const include = [];
        if (seasonFilter.includeSeason) {
            include.push(seasonInclude());
        }

        const { rows: events, count: total } = await Event.findAndCountAll({
            where,
            include,
            order: [['event_date', 'ASC']],
            limit,
            offset,
            distinct: true
        });

        res.status(200).json({
            success: true,
            data: events,
            count: events.length,
            pagination: paginationMeta({ page, limit, total })
        });

    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ success: false, error: error.message });
        }
        logger.error('Error fetching events:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch events'
        });
    }
};

/**
 * Get event by ID
 * GET /api/events/:id
 */
const getEventById = async (req, res) => {
    try {
        const { id } = req.params;

        const event = await Event.findByPk(id);

        if (!event) {
            return res.status(404).json({
                success: false,
                error: 'Event not found'
            });
        }

        res.status(200).json({
            success: true,
            data: event
        });

    } catch (error) {
        logger.error('Error fetching event:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch event'
        });
    }
};

/**
 * download content
 * GET /api/events/:id/download
 */
const downloadContent = async (req, res) => {
    try {
        const event = await Event.findByPk(req.params.id);
        if (!event || !event.upload_file){
            return res.status(404).json({
                success: false,
                error: 'File not found'
            });
        }
        res.download(event.upload_file);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to download file'
        });
    }
};

/**
 * Update an event
 * PUT /api/events/:id
 */
const updateEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, event_date, location, category, upload_file, main_image, attendees, registration_enabled } = req.body;

        const event = await Event.findByPk(id);

        if (!event) {
            return res.status(404).json({
                success: false,
                error: 'Event not found'
            });
        }

        // Validate category if provided
        if (category) {
            const validCategories = ['Session', 'Workshop', 'Entertainment'];
            if (!validCategories.includes(category)) {
                return res.status(400).json({
                    success: false,
                    error: `Category must be one of: ${validCategories.join(', ')}`
                });
            }
        }

        // Validate date if provided
        if (event_date) {
            const eventDate = new Date(event_date);
            if (isNaN(eventDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid event_date format'
                });
            }
        }

        // Convert registration_enabled to boolean if provided
        const regEnabled = registration_enabled !== undefined 
            ? convertToBoolean(registration_enabled, true)
            : undefined;

        // Handle file URLs from req.body (files are stored on R2 cloud storage)
        let newUploadFile = event.upload_file; // Default to existing
        if (upload_file !== undefined) {
            newUploadFile = (upload_file === null || upload_file === '') ? null : upload_file;
        }

        let newMainImage = event.main_image; // Default to existing
        if (main_image !== undefined) {
            newMainImage = (main_image === null || main_image === '') ? null : main_image;
        }

        // Build update object - only include fields that are explicitly provided
        const updateData = {};
        
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (event_date !== undefined) updateData.event_date = event_date;
        if (location !== undefined) updateData.location = location;
        if (category !== undefined) updateData.category = category;
        if (attendees !== undefined) updateData.attendees = attendees;
        if (regEnabled !== undefined) updateData.registration_enabled = regEnabled;
        
        // Always update file fields if they've been determined
        updateData.upload_file = newUploadFile;
        updateData.main_image = newMainImage;

        await event.update(updateData);

        // Reload event to get updated data
        await event.reload();

        await logAdminAction(
            'event_updated',
            `Updated event "${event.name}"`,
            req,
            'event',
            event.event_id,
            event.season_id
        );

        res.status(200).json({
            success: true,
            message: 'Event updated successfully',
            data: event
        });

    } catch (error) {
        logger.error('Error updating event:', error);
        logger.error('Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        
        // Handle Sequelize validation errors
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({
                success: false,
                error: 'Validation error',
                details: error.errors.map(e => e.message)
            });
        }

        // Handle Sequelize database errors
        if (error.name === 'SequelizeDatabaseError') {
            logger.error('Database error:', error.original);
            return res.status(500).json({
                success: false,
                error: 'Database error occurred',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }

        res.status(500).json({
            success: false,
            error: 'Failed to update event',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Delete an event
 * DELETE /api/events/:id
 */
const deleteEvent = async (req, res) => {
    try {
        const { id } = req.params;

        const event = await Event.findByPk(id);

        if (!event) {
            return res.status(404).json({
                success: false,
                error: 'Event not found'
            });
        }

        const eventName = event.name;
        const seasonId = event.season_id;
        await event.destroy();

        await logAdminAction(
            'event_deleted',
            `Deleted event "${eventName}"`,
            req,
            'event',
            id,
            seasonId
        );

        res.status(200).json({
            success: true,
            message: 'Event deleted successfully'
        });

    } catch (error) {
        logger.error('Error deleting event:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete event'
        });
    }
};

/**
 * Add feedback to an event
 * POST /api/events/:id/feedback
 */
const addFeedback = async (req, res) => {
    try {
        const { id } = req.params;
        const { feedback } = req.body;

        // Validation
        if (!feedback || !feedback.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Feedback text is required'
            });
        }

        if (feedback.length > 2000) {
            return res.status(400).json({
                success: false,
                error: 'Feedback must be less than 2000 characters'
            });
        }

        // Check if event exists
        const event = await Event.findByPk(id);
        if (!event) {
            return res.status(404).json({
                success: false,
                error: 'Event not found'
            });
        }

        // Create feedback (guests can submit feedback)
        const newFeedback = await EventFeedback.create({
            event_id: id,
            feedback: feedback.trim()
        });

        res.status(201).json({
            success: true,
            message: 'Feedback submitted successfully',
            data: newFeedback
        });

    } catch (error) {
        logger.error('Error adding feedback:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to submit feedback',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Get all feedback for an event
 * GET /api/events/:id/feedback
 */
const getEventFeedback = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if event exists
        const event = await Event.findByPk(id);
        if (!event) {
            return res.status(404).json({
                success: false,
                error: 'Event not found'
            });
        }

        const { page, limit, offset } = parsePagination(req.query);

        const { rows: feedbacks, count: total } = await EventFeedback.findAndCountAll({
            where: {
                event_id: id
            },
            order: [['created_at', 'DESC']],
            limit,
            offset
        });

        res.status(200).json({
            success: true,
            data: feedbacks,
            count: feedbacks.length,
            pagination: paginationMeta({ page, limit, total })
        });

    } catch (error) {
        logger.error('Error fetching feedback:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch feedback'
        });
    }
};

/**
 * Delete feedback
 * DELETE /api/events/:eventId/feedback/:feedbackId
 */
const deleteFeedback = async (req, res) => {
    try {
        const { eventId, feedbackId } = req.params;
        const userRole = req.user?.role;

        // Only admin and board can delete feedback
        if (userRole !== 'admin' && userRole !== 'board') {
            return res.status(403).json({
                success: false,
                error: 'Only administrators can delete feedback'
            });
        }

        // Find feedback
        const feedback = await EventFeedback.findByPk(feedbackId);

        if (!feedback) {
            return res.status(404).json({
                success: false,
                error: 'Feedback not found'
            });
        }

        await feedback.destroy();

        await logAdminAction(
            'event_feedback_deleted',
            `Deleted feedback #${feedbackId} for event #${eventId}`,
            req,
            'event',
            eventId
        );

        res.status(200).json({
            success: true,
            message: 'Feedback deleted successfully'
        });

    } catch (error) {
        logger.error('Error deleting feedback:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete feedback'
        });
    }
};

module.exports = {
    addEvent,
    getAllEvents,
    getEventById,
    updateEvent,
    downloadContent,
    deleteEvent,
    addFeedback,
    getEventFeedback,
    deleteFeedback
};
