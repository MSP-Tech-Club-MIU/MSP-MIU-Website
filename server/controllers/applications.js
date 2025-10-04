const sequelize = require('../config/db');

// Submit new application
const createApplication = async (req, res) => {
    try {
        const {
            university_id,
            full_name,
            email,
            faculty,
            year,
            phone_number,
            first_choice,
            second_choice,
            skills,
            motivation,
            schedule
        } = req.body;

        // Validation
        if (!university_id || !full_name || !email || !faculty || !year || !phone_number || 
            !first_choice || !second_choice || !skills || !motivation) {
            return res.status(400).json({ 
                success: false,
                error: 'All fields are required' 
            });
        }

        // Check if university_id already exists
        const [existing] = await sequelize.query(
            'SELECT application_id FROM applications WHERE university_id = ?',
            [university_id]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'Application with this university ID already exists'
            });
        }

        // Insert new application
        const [result] = await sequelize.query(
            `INSERT INTO applications 
            (university_id, full_name, email, faculty, year, phone_number, 
             first_choice, second_choice, skills, motivation, schedule) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [university_id, full_name, email, faculty, year, phone_number, 
             first_choice, second_choice, skills, motivation, schedule || '']
        );

        res.status(201).json({
            success: true,
            message: 'Application submitted successfully',
            data: {
                application_id: result.insertId,
                university_id,
                status: 'pending'
            }
        });

    } catch (error) {
        console.error('Error submitting application:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};


const getAllApplications = async (req, res) => {
    try {
        const [applications] = await sequelize.query(`
            SELECT * from applications
        `);

        res.json({
            success: true,
            data: applications,
            count: applications.length
        });
    } catch (error) {
        console.error('Error fetching applications:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};




// Update application status (approve/reject)
const updateApplicationStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;


        const [result] = await sequelize.query(
            'UPDATE applications SET status = ? WHERE application_id = ?',
            [status, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

   
        res.json({
            success: true,
            message: `Application ${status} successfully`,
            data: { application_id: id, status }
        });

    } catch (error) {
        console.error('Error updating application status:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Delete application
const deleteApplication = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await sequelize.query(
            'DELETE FROM applications WHERE application_id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        res.json({
            success: true,
            message: 'Application deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting application:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

module.exports = {
    createApplication,
    getAllApplications,
    updateApplicationStatus,
    deleteApplication
};