const { Board } = require('../models');

/**
 * Admin Authorization Middleware that
 * allows only admin users to access the admin panel
 * which are President, Vice President, and Head of Software Development
 * That must be used after authentication Token middleware
 */

const adminAuth = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json(
                {
                    success: false,
                    error: 'Authentication Required'
                });
        }

        // Now let us check if user logged-in even exist in Board or not

        const boardMember = await Board.findOne(
            {
                where: { user_id: req.user.user_id }

            });

        if (!boardMember) {
            return res.status(403).json({
                success: false,
                error: 'Acccess denied, Admin Panel is restriced only to Admin Members.'
            });
        }

        // President and Vice President now have full access as Admins
        const allowedPositions = ['President', 'Vice President'];
        const position = boardMember.position;

        if (allowedPositions.includes(position)) {
            req.boardMember = boardMember;
            return next();
        }

        // Head of SW Development Dept now have full access as Admin when (department_id = 1)

        if (position === 'Head' && boardMember.department_id === 1 || position === 'Head' && boardMember.department_id === 2) {
            req.boardMember = boardMember;
            return next();
        }

        // Everyone else is denied from guests, Other Board members cause they have specific roles not as Admins but aa I gave them
        return res.status(403).json(
            {
                success: false,
                error: 'Access denied. Only President, Vice President, and Head of Software Development can access the admin panel.'
            });
    }

    catch (error) {
        console.error('Admin auth middleware error:', error);
        return res.status(500).json(
            {
                success: false,
                error: 'Authorization error'
            });
    }
};
module.exports = { adminAuth };

