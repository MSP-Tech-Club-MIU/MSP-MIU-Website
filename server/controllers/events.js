const { Event } = require('../models');
const { Op } = require('sequelize');

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
}






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
        // Files are uploaded to R2 via /api/upload route first, then URLs are sent here
        let newUploadFile = event.upload_file; // Default to existing
        if (upload_file !== undefined) {
            // URL provided in req.body or explicitly set to null/empty to clear
            newUploadFile = (upload_file === null || upload_file === '') ? null : upload_file;
        }

        let newMainImage = event.main_image; // Default to existing
        if (main_image !== undefined) {
            // URL provided in req.body or explicitly set to null/empty to clear
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

        res.status(200).json({
            success: true,
            message: 'Event updated successfully',
            data: event
        });

    } catch (error) {
        console.error('Error updating event:', error);
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
    downloadContent,
    deleteEvent
};
