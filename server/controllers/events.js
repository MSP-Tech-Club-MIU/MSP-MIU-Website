const { Event } = require('../models');
const { Op } = require('sequelize');

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
        let regEnabled = true; // default
        if (registration_enabled !== undefined) {
            if (typeof registration_enabled === 'string') {
                regEnabled = registration_enabled.toLowerCase() === 'true';
            } else {
                regEnabled = Boolean(registration_enabled);
            }
        }

        // Create new event
        const newEvent = await Event.create({
            name,
            description: description || null,
            event_date,
            location,
            category,
            upload_file: upload_file || null,
            main_image: main_image || null,
            attendees: attendees || null,
            registration_enabled: regEnabled
        });

        res.status(201).json({
            success: true,
            message: 'Event created successfully',
            data: newEvent
        });

    } catch (error) {
        console.error('Error creating event:', error);
        console.error('Error details:', {
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
            console.error('Database error:', error.original);
            return res.status(500).json({
                success: false,
                error: 'Database error occurred',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }

        // Handle database column errors
        if (error.message && (error.message.includes('registration_enabled') || error.message.includes('Unknown column'))) {
            return res.status(500).json({
                success: false,
                error: 'Database configuration error. Please ensure the registration_enabled column exists in the events table.',
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
        
        // Build where clause
        const where = {};
        
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

        const events = await Event.findAll({
            where,
            order: [['event_date', 'ASC']]
        });

        res.status(200).json({
            success: true,
            data: events,
            count: events.length
        });

    } catch (error) {
        console.error('Error fetching events:', error);
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
        console.error('Error fetching event:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch event'
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
        let regEnabled = undefined;
        if (registration_enabled !== undefined) {
            if (typeof registration_enabled === 'string') {
                regEnabled = registration_enabled.toLowerCase() === 'true';
            } else {
                regEnabled = Boolean(registration_enabled);
            }
        }

        // Update event
        await event.update({
            ...(name && { name }),
            ...(description !== undefined && { description }),
            ...(event_date && { event_date }),
            ...(location && { location }),
            ...(category && { category }),
            ...(upload_file !== undefined && { upload_file }),
            ...(main_image !== undefined && { main_image }),
            ...(attendees !== undefined && { attendees }),
            ...(regEnabled !== undefined && { registration_enabled: regEnabled })
        });

        res.status(200).json({
            success: true,
            message: 'Event updated successfully',
            data: event
        });

    } catch (error) {
        console.error('Error updating event:', error);
        
        // Handle Sequelize validation errors
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({
                success: false,
                error: 'Validation error',
                details: error.errors.map(e => e.message)
            });
        }

        res.status(500).json({
            success: false,
            error: 'Failed to update event'
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

        await event.destroy();

        res.status(200).json({
            success: true,
            message: 'Event deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete event'
        });
    }
};

module.exports = {
    addEvent,
    getAllEvents,
    getEventById,
    updateEvent,
    deleteEvent
};
