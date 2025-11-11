const bcrypt = require('bcrypt');
const { User, Member, Board } = require('../models');
const { generateToken: generateJWTToken } = require('../utils/jwt');
const { logAuditEvent, logError, logSecurityEvent } = require('../utils/logger');

/**
 * Login user
 * POST /api/auth/login
 */
const login = async (req, res) => {
    const startTime = Date.now();
    let loginAttempt = {
        university_id: req.body?.university_id || 'unknown',
        success: false,
        error_type: null
    };

    try {
        const { university_id, password } = req.body;

        // Validation
        if (!university_id || !password) {
            loginAttempt.error_type = 'MISSING_CREDENTIALS';
            logAuditEvent('LOGIN_FAILURE', {
                reason: 'Missing credentials',
                university_id: university_id || 'not_provided'
            }, req);
            
            return res.status(400).json({
                success: false,
                error: 'University ID and password are required'
            });
        }

        // Validate university ID format (xxxx/xxxxx)
        const universityIdRegex = /^\d{4}\/\d{5}$/;
        if (!universityIdRegex.test(university_id)) {
            loginAttempt.error_type = 'INVALID_FORMAT';
            logAuditEvent('LOGIN_FAILURE', {
                reason: 'Invalid university ID format',
                university_id
            }, req);
            
            return res.status(400).json({
                success: false,
                error: 'Invalid university ID format. Expected format: xxxx/xxxxx (e.g. 20xx/xxxxx)'
            });
        }

        // Find user by university_id
        const user = await User.findOne({ where: { university_id } });

        if (!user) {
            loginAttempt.error_type = 'USER_NOT_FOUND';
            logAuditEvent('LOGIN_FAILURE', {
                reason: 'User not found',
                university_id
            }, req);
            
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        // Check if user is active
        if (!user.is_active) {
            loginAttempt.error_type = 'ACCOUNT_INACTIVE';
            loginAttempt.user_id = user.user_id;
            logSecurityEvent('LOGIN_BLOCKED', {
                reason: 'Account inactive',
                user_id: user.user_id,
                university_id
            }, req);
            
            return res.status(403).json({
                success: false,
                error: 'Account is inactive. Please contact administrator.'
            });
        }

        // Check if user has a password set
        if (!user.password_hash) {
            loginAttempt.error_type = 'NO_PASSWORD_SET';
            loginAttempt.user_id = user.user_id;
            logSecurityEvent('LOGIN_FAILURE', {
                reason: 'No password set',
                user_id: user.user_id,
                university_id
            }, req);
            
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            loginAttempt.error_type = 'INVALID_PASSWORD';
            loginAttempt.user_id = user.user_id;
            logAuditEvent('LOGIN_FAILURE', {
                reason: 'Invalid password',
                user_id: user.user_id,
                university_id
            }, req);
            
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        // Generate token with user id, role, and department_id
        const tokenResult = generateJWTToken({
            id: user.user_id,
            userId: user.user_id, // Also include userId for backward compatibility
            role: user.role,
            department: user.department_id || null
        });

        if (!tokenResult.success) {
            loginAttempt.error_type = 'TOKEN_GENERATION_FAILED';
            loginAttempt.user_id = user.user_id;
            logError('auth.login', new Error(tokenResult.error), {
                user_id: user.user_id,
                university_id
            }, req);
            
            return res.status(500).json({
                success: false,
                error: 'Authentication failed. Please try again later.'
            });
        }

        // Log successful login
        loginAttempt.success = true;
        loginAttempt.user_id = user.user_id;
        const loginDuration = Date.now() - startTime;
        logAuditEvent('LOGIN_SUCCESS', {
            user_id: user.user_id,
            university_id: user.university_id,
            role: user.role,
            department_id: user.department_id,
            duration_ms: loginDuration
        }, req);

        // Return user data (without password) and token
        res.json({
            success: true,
            message: 'Login successful',
            token: tokenResult.token,
            user: {
                user_id: user.user_id,
                university_id: user.university_id,
                full_name: user.full_name || null,
                email: user.email,
                role: user.role,
                is_active: user.is_active,
                department_id: user.department_id
            }
        });

    } catch (error) {
        loginAttempt.error_type = 'INTERNAL_ERROR';
        logError('auth.login', error, {
            university_id: loginAttempt.university_id,
            user_id: loginAttempt.user_id
        }, req);
        
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

/**
 * Register new user
 * POST /api/auth/register
 */
const register = async (req, res) => {
    try {
        const { email, password, role } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email format'
            });
        }

        // Validate password length
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 6 characters long'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ where: { email } });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: 'User with this email already exists'
            });
        }

        // Hash password
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);

        // Determine user role (default to 'member' if not provided or invalid)
        const validRoles = ['member', 'board', 'admin'];
        const userRole = role && validRoles.includes(role) ? role : 'member';

        // Create user (default to inactive, admin must activate)
        const user = await User.create({
            email,
            password_hash,
            role: userRole,
            is_active: false // Default to inactive, require admin activation
        });

        // Generate token
        const tokenResult = generateJWTToken({
            userId: user.user_id,
            id: user.user_id,
            role: user.role
        });

        if (!tokenResult.success) {
            logError('auth.register', new Error(tokenResult.error), {
                email,
                user_id: user.user_id
            }, req);
            
            // Delete user if token generation failed
            await user.destroy();
            
            return res.status(500).json({
                success: false,
                error: 'Registration failed. Please try again later.'
            });
        }

        // Log registration
        logAuditEvent('REGISTRATION_SUCCESS', {
            user_id: user.user_id,
            email,
            role: user.role
        }, req);

        res.status(201).json({
            success: true,
            message: 'User registered successfully. Account pending activation.',
            token: tokenResult.token,
            user: {
                user_id: user.user_id,
                email: user.email,
                role: user.role,
                is_active: user.is_active
            }
        });

    } catch (error) {
        // Determine error type for better error messages
        let errorMessage = 'Registration failed';
        let statusCode = 500;

        if (error.name === 'SequelizeUniqueConstraintError') {
            errorMessage = 'User with this email already exists';
            statusCode = 409;
        } else if (error.name === 'SequelizeValidationError') {
            errorMessage = 'Invalid input data';
            statusCode = 400;
        }

        logError('auth.register', error, {
            email: req.body?.email || 'unknown',
            error_name: error.name
        }, req);
        
        res.status(statusCode).json({
            success: false,
            error: errorMessage
        });
    }
};

/**
 * Get current user profile
 * GET /api/auth/me
 */
const getMe = async (req, res) => {
    try {
        // User is already attached to req by authenticateToken middleware
        const user = await User.findByPk(req.user.user_id, {
            attributes: { exclude: ['password_hash'] }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            user: {
                user_id: user.user_id,
                university_id: user.university_id,
                full_name: user.full_name || null,
                email: user.email,
                role: user.role,
                is_active: user.is_active,
                department_id: user.department_id,
                created_at: user.created_at
            }
        });

    } catch (error) {
        logError('auth.getMe', error, {
            user_id: req.user?.user_id
        }, req);
        
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

/**
 * Change password
 * POST /api/auth/change-password
 */
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'Current password and new password are required'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'New password must be at least 6 characters long'
            });
        }

        // Get user with password hash
        const user = await User.findByPk(req.user.user_id);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);

        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                error: 'Current password is incorrect'
            });
        }

        // Hash new password
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(newPassword, saltRounds);

        // Update password
        await user.update({ password_hash });

        res.json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        logError('auth.changePassword', error, {
            user_id: req.user?.user_id
        }, req);
        
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

/**
 * Logout user
 * POST /api/auth/logout
 * Note: Since JWT tokens are stateless, logout is handled client-side by removing the token.
 * This endpoint confirms the logout and can be used for logging/auditing purposes.
 */
const logout = async (req, res) => {
    try {
        // Token is already verified by authenticateToken middleware
        // User info is available in req.user if needed for logging
        
        res.json({
            success: true,
            message: 'Logout successful'
        });
    } catch (error) {
        logError('auth.logout', error, {
            user_id: req.user?.user_id
        }, req);
        
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

/**
 * Verify token (for frontend to check if token is still valid)
 * GET /api/auth/verify
 */
const verifyToken = async (req, res) => {
    try {
        // If middleware passed, token is valid
        res.json({
            success: true,
            message: 'Token is valid',
            user: {
                user_id: req.user.user_id,
                university_id: req.user.university_id || null,
                full_name: req.user.full_name || null,
                email: req.user.email,
                role: req.user.role,
                is_active: req.user.is_active,
                department_id: req.user.department_id || null
            }
        });
    } catch (error) {
        logError('auth.verifyToken', error, {
            user_id: req.user?.user_id
        }, req);
        
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

/**
 * Verify activation token and return email
 * POST /api/auth/verify-activation-token
 * This endpoint verifies an activation token and returns the email
 * Used by the frontend to verify the token and get the email before showing the form
 */
const verifyActivationToken = async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                error: 'Token is required'
            });
        }

        const { verifyToken } = require('../utils/jwt');
        const tokenResult = verifyToken(token);
        
        if (!tokenResult.success) {
            logSecurityEvent('ACTIVATION_TOKEN_VERIFICATION_FAILED', {
                reason: tokenResult.error,
                error: tokenResult.error
            }, req);
            
            return res.status(400).json({
                success: false,
                error: tokenResult.error === 'Token expired' 
                    ? 'Activation link has expired. Please request a new activation email.'
                    : 'Invalid activation token.'
            });
        }

        const decoded = tokenResult.decoded;
        
        // Verify token type and extract email
        if (decoded.type === 'board_activation') {
            // Verify board member exists
            const boardMember = await Board.findOne({ 
                where: { 
                    email: decoded.email,
                    board_id: decoded.board_id 
                } 
            });
            
            if (!boardMember) {
                return res.status(404).json({
                    success: false,
                    error: 'Board member not found for this token.'
                });
            }

            // Check if already activated
            const existingUser = await User.findOne({ where: { email: decoded.email } });
            if (existingUser && existingUser.password_hash) {
                return res.status(400).json({
                    success: false,
                    error: 'Account already activated. Please use the login page.'
                });
            }

            res.json({
                success: true,
                email: decoded.email,
                type: 'board',
                board_id: decoded.board_id
            });

        } else if (decoded.type === 'member_activation' || decoded.type === 'activation') {
            // Verify member exists
            const member = await Member.findOne({ where: { email: decoded.email } });
            
            if (!member) {
                return res.status(404).json({
                    success: false,
                    error: 'Member not found for this token.'
                });
            }

            // Check if already activated
            const existingUser = await User.findOne({ where: { email: decoded.email } });
            if (existingUser && existingUser.password_hash) {
                return res.status(400).json({
                    success: false,
                    error: 'Account already activated. Please use the login page.'
                });
            }

            res.json({
                success: true,
                email: decoded.email,
                type: 'member'
            });

        } else if (decoded.email) {
            // Legacy token format - just has email
            res.json({
                success: true,
                email: decoded.email,
                type: 'unknown'
            });
        } else {
            return res.status(400).json({
                success: false,
                error: 'Invalid token format.'
            });
        }

    } catch (error) {
        logError('auth.verifyActivationToken', error, {
            token_provided: !!req.body?.token
        }, req);
        
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

/**
 * Activate account - Set password for member/user by token or email
 * POST /api/auth/activate
 * This endpoint is used when a member/board member receives an activation email
 * and needs to set their password to activate their account
 * 
 * Accepts either:
 * - token: JWT token containing email and type (preferred, more secure)
 * - email: email address (legacy support, less secure)
 */
const activateAccount = async (req, res) => {
    try {
        const { token, email, password } = req.body;

        // Validation - require password and either token or email
        if (!password) {
            return res.status(400).json({
                success: false,
                error: 'Password is required'
            });
        }

        if (!token && !email) {
            return res.status(400).json({
                success: false,
                error: 'Token or email is required'
            });
        }

        // Validate password length
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 6 characters long'
            });
        }

        let activationEmail = email;
        let isBoardMember = false;
        let boardMember = null;
        let member = null;

        // If token is provided, verify it and extract email
        if (token) {
            const { verifyToken } = require('../utils/jwt');
            const tokenResult = verifyToken(token);
            
            if (!tokenResult.success) {
                logSecurityEvent('ACCOUNT_ACTIVATION_FAILED', {
                    reason: 'Invalid or expired token',
                    error: tokenResult.error
                }, req);
                
                return res.status(400).json({
                    success: false,
                    error: tokenResult.error === 'Token expired' 
                        ? 'Activation link has expired. Please request a new activation email.'
                        : 'Invalid activation token. Please use the link from your email.'
                });
            }

            const decoded = tokenResult.decoded;
            
            // Verify token type
            if (decoded.type === 'board_activation') {
                isBoardMember = true;
                activationEmail = decoded.email;
                
                // Verify board member exists
                boardMember = await Board.findOne({ 
                    where: { 
                        email: activationEmail,
                        board_id: decoded.board_id 
                    } 
                });
                
                if (!boardMember) {
                    logSecurityEvent('ACCOUNT_ACTIVATION_FAILED', {
                        reason: 'Board member not found for token',
                        email: activationEmail,
                        board_id: decoded.board_id
                    }, req);
                    
                    return res.status(404).json({
                        success: false,
                        error: 'Invalid activation token. Board member not found.'
                    });
                }
            } else if (decoded.type === 'member_activation' || decoded.type === 'activation') {
                activationEmail = decoded.email;
                // Find member by email
                member = await Member.findOne({ where: { email: activationEmail } });
                
                if (!member) {
                    logSecurityEvent('ACCOUNT_ACTIVATION_FAILED', {
                        reason: 'Member not found for token',
                        email: activationEmail
                    }, req);
                    
                    return res.status(404).json({
                        success: false,
                        error: 'Invalid activation token. Member not found.'
                    });
                }
            } else if (decoded.email) {
                // Legacy token format - just has email
                activationEmail = decoded.email;
                
                // Look up member or board member by email
                member = await Member.findOne({ where: { email: activationEmail } });
                
                if (!member) {
                    // If not a member, check if it's a board member
                    boardMember = await Board.findOne({ where: { email: activationEmail } });
                    if (boardMember) {
                        isBoardMember = true;
                    }
                }
            } else {
                logSecurityEvent('ACCOUNT_ACTIVATION_FAILED', {
                    reason: 'Invalid token payload',
                    token_type: decoded.type
                }, req);
                
                return res.status(400).json({
                    success: false,
                    error: 'Invalid activation token format.'
                });
            }
        } else {
            // Legacy support: email provided directly (less secure)
            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid email format'
                });
            }

            activationEmail = email;

            // Find member or board member by email
            // First check if it's a member
            member = await Member.findOne({ where: { email: activationEmail } });

            // If not a member, check if it's a board member
            if (!member) {
                // Find board member by email directly from board table
                boardMember = await Board.findOne({ where: { email: activationEmail } });
                if (boardMember) {
                    isBoardMember = true;
                }
            }
        }

        if (!member && !boardMember) {
            logSecurityEvent('ACCOUNT_ACTIVATION_FAILED', {
                reason: 'Member or board member not found',
                email: activationEmail
            }, req);
            
            return res.status(404).json({
                success: false,
                error: 'No account found. Please contact the administrator.'
            });
        }

        // Check if user already exists
        let user = null;
        let role = 'member';
        let recordId = null;
        let recordType = 'member';
        
        if (isBoardMember && boardMember) {
            role = 'board';
            recordId = boardMember.board_id;
            recordType = 'board';
            
            if (boardMember.user_id) {
                user = await User.findByPk(boardMember.user_id);
            } else {
                user = await User.findOne({ where: { email: activationEmail } });
            }
        } else if (member) {
            role = 'member';
            recordId = member.member_id;
            recordType = 'member';
            
            if (member.user_id) {
                user = await User.findByPk(member.user_id);
            } else {
                user = await User.findOne({ where: { email: activationEmail } });
            }
        }

        // Hash password
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);

        if (user) {
            // User exists - update password and activate
            if (user.password_hash) {
                // User already has a password set
                logSecurityEvent('ACCOUNT_ACTIVATION_FAILED', {
                    reason: 'Password already set',
                    user_id: user.user_id,
                    email: activationEmail
                }, req);
                
                return res.status(400).json({
                    success: false,
                    error: 'Account already activated. Please use the login page.'
                });
            }

            // Update user: set password, role, and activate
            // If it's a board member, ensure role is set to 'board'
            const updateData = {
                password_hash,
                is_active: true
            };
            
            // Always set role to 'board' if it's a board member
            if (isBoardMember) {
                updateData.role = 'board';
            } else {
                updateData.role = role;
            }
            
            await user.update(updateData);

            // Link record to user if not already linked
            if (isBoardMember && boardMember && !boardMember.user_id) {
                await boardMember.update({ user_id: user.user_id });
            } else if (member && !member.user_id) {
                await member.update({ user_id: user.user_id });
            }

            // Refresh user to get updated role
            await user.reload();

            // Log activation
            logAuditEvent('ACCOUNT_ACTIVATED', {
                user_id: user.user_id,
                email: activationEmail,
                role: user.role,
                record_id: recordId,
                record_type: recordType
            }, req);

            res.json({
                success: true,
                message: 'Account activated successfully',
                user: {
                    user_id: user.user_id,
                    email: user.email,
                    university_id: user.university_id,
                    role: user.role,
                    is_active: true
                }
            });

        } else {
            // User doesn't exist - create new user
            if (isBoardMember && boardMember) {
                // Create user for board member with role 'board'
                // Get university_id directly from board table (now stored in board table)
                // Fallback to Application table if not in board table (for backwards compatibility)
                let universityId = boardMember.university_id || null;
                
                // If university_id not in board table, try to get it from Application table
                if (!universityId) {
                    try {
                        const { Application } = require('../models');
                        const application = await Application.findOne({ 
                            where: { email: activationEmail },
                            order: [['created_at', 'DESC']]
                        });
                        if (application && application.university_id) {
                            universityId = application.university_id;
                        }
                    } catch (appError) {
                        // If Application model doesn't exist or query fails, just continue with null university_id
                        console.warn('Could not fetch university_id from Application:', appError.message);
                    }
                }
                
                user = await User.create({
                    email: boardMember.email,
                    university_id: universityId,
                    full_name: boardMember.full_name,
                    password_hash,
                    department_id: boardMember.department_id,
                    role: 'board', // Ensure role is set to 'board'
                    is_active: true
                });

                // Link board member to user
                await boardMember.update({ user_id: user.user_id });

                // Log activation
                logAuditEvent('ACCOUNT_ACTIVATED', {
                    user_id: user.user_id,
                    email: activationEmail,
                    role: 'board',
                    board_id: boardMember.board_id
                }, req);

            } else if (member) {
                // Create user for member
                user = await User.create({
                    email: member.email,
                    university_id: member.university_id,
                    full_name: member.full_name,
                    password_hash,
                    department_id: member.department_id,
                    role: 'member',
                    is_active: true
                });

                // Link member to user
                await member.update({ user_id: user.user_id });

                // Log activation
                logAuditEvent('ACCOUNT_ACTIVATED', {
                    user_id: user.user_id,
                    email: activationEmail,
                    role: 'member',
                    member_id: member.member_id
                }, req);
            }

            res.status(201).json({
                success: true,
                message: 'Account activated successfully',
                user: {
                    user_id: user.user_id,
                    email: user.email,
                    university_id: user.university_id,
                    role: user.role,
                    is_active: true
                }
            });
        }

    } catch (error) {
        // Determine error type for better error messages
        let errorMessage = 'Account activation failed';
        let statusCode = 500;

        if (error.name === 'SequelizeUniqueConstraintError') {
            errorMessage = 'Account with this email already exists';
            statusCode = 409;
        } else if (error.name === 'SequelizeValidationError') {
            errorMessage = 'Invalid input data';
            statusCode = 400;
        } else if (error.message) {
            // Include the actual error message for debugging
            errorMessage = error.message;
        }

        // Log detailed error information
        logError('auth.activateAccount', error, {
            email: req.body?.email || (req.body?.token ? 'token_provided' : 'unknown'),
            error_name: error.name,
            error_message: error.message,
            stack: error.stack
        }, req);
        
        // In development, include more details
        const isDevelopment = process.env.NODE_ENV !== 'production';
        
        res.status(statusCode).json({
            success: false,
            error: errorMessage,
            ...(isDevelopment && { details: error.message, stack: error.stack })
        });
    }
};

module.exports = {
    login,
    register,
    logout,
    getMe,
    changePassword,
    verifyToken,
    verifyActivationToken,
    activateAccount
};

