const sequelize = require('../config/db');

// Get all members
const getAllMembers = async (req, res) => {
    try {
        const [members] = await sequelize.query(`
            SELECT * from members
        `);

        res.json({
            success: true,
            data: members,
            count: members.length
        });
    } catch (error) {
        console.error('Error fetching members:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Get member by ID
const getMemberById = async (req, res) => {
    try {
        const { id } = req.params;

        const [members] = await sequelize.query(`
            SELECT * from members
            WHERE id = ? 
        `, [id]);

        if (members.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Member not found'
            });
        }

        res.json({
            success: true,
            data: members[0]
        });
    } catch (error) {
        console.error('Error fetching member:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};


// Delete member
const deleteMember = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await sequelize.query(
            'DELETE FROM members WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: 'Member not found'
            });
        }

        res.json({
            success: true,
            message: 'Member deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting member:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

module.exports = {
    getAllMembers,
    getMemberById,
    deleteMember
};