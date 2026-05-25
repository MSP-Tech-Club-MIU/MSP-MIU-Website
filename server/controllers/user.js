const bcrypt = require('bcrypt');
const { User } = require('../models');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');
const { generateToken: generateJWTToken } = require('../utils/jwt');
const { logAuditEvent, logError, logSecurityEvent } = require('../utils/logger');
const { r2, PutObjectCommand } = require('../config/cloud');

/**
 * Register user (only through invitation)
 * Triggered via Nodemailer link from accepted applicant email
 * POST /api/users/register
 */
const registerUser = async (req, res) => {
    try {
        const { full_name, university_id, email, password } = req.body;

        // Validation
        if (!full_name || !university_id || !email || !password) {
            return res.status(400).json({
                success: false,
                error: 'All fields are required: full_name, university_id, email, password'
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
        const existingUser = await User.findOne({
            where: {
                [Op.or]: [
                    { email },
                    { university_id }
                ]
            }
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: 'User with this email or university ID already exists'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user with role 'member' and is_active = true (since they're invited)
        const user = await User.create({
            full_name,
            university_id,
            email,
            password_hash: hashedPassword,
            role: 'member',
            is_active: true
        });

        res.status(201).json({
            success: true,
            message: 'Account created successfully',
            user_id: user.user_id
        });

    } catch (error) {
        // Determine error type for better error messages
        let errorMessage = 'Registration failed';
        let statusCode = 500;

        if (error.name === 'SequelizeUniqueConstraintError') {
            errorMessage = 'User with this email or university ID already exists';
            statusCode = 409;
        } else if (error.name === 'SequelizeValidationError') {
            errorMessage = 'Invalid input data';
            statusCode = 400;
        }

        logError('user.registerUser', error, {
            email: req.body?.email || 'unknown',
            university_id: req.body?.university_id || 'unknown',
            error_name: error.name
        }, req);
        
        res.status(statusCode).json({
            success: false,
            error: errorMessage
        });
    }
};

/**
 * Login user
 * POST /api/users/login
 * Requires university_id (format: "20xx/xxxxx") and password
 */
const loginUser = async (req, res) => {
    const startTime = Date.now();
    let loginAttempt = {
        university_id: req.body?.university_id || 'unknown',
        success: false,
        error_type: null
    };

    try {
        const { university_id, password } = req.body;

        // Validation - require university_id and password
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

        // Find user by university_id
        // University ID format: "20xx/xxxxx"
        const user = await User.findOne({ where: { university_id } });

        if (!user) {
            loginAttempt.error_type = 'USER_NOT_FOUND';
            logAuditEvent('LOGIN_FAILURE', {
                reason: 'User not found',
                university_id
            }, req);
            
            return res.status(404).json({
                success: false,
                error: 'User not found with this university ID'
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
                error: 'User has no password set'
            });
        }

        // Verify password
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            loginAttempt.error_type = 'INVALID_PASSWORD';
            loginAttempt.user_id = user.user_id;
            logAuditEvent('LOGIN_FAILURE', {
                reason: 'Invalid password',
                user_id: user.user_id,
                university_id
            }, req);
            
            return res.status(401).json({
                success: false,
                error: 'Invalid password'
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
                error: 'Account is inactive. Please contact the administrator.'
            });
        }

        // Generate token with user id, role, and department_id
        const tokenResult = generateJWTToken({
            id: user.user_id,
            userId: user.user_id,
            role: user.role,
            department: user.department_id || null
        });

        if (!tokenResult.success) {
            loginAttempt.error_type = 'TOKEN_GENERATION_FAILED';
            loginAttempt.user_id = user.user_id;
            logError('user.loginUser', new Error(tokenResult.error), {
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

        res.json({
            success: true,
            message: 'Login successful',
            token: tokenResult.token,
            user: {
                user_id: user.user_id,
                university_id: user.university_id,
                role: user.role,
                is_active: user.is_active,
                department_id: user.department_id
            }
        });

    } catch (error) {
        loginAttempt.error_type = 'INTERNAL_ERROR';
        logError('user.loginUser', error, {
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
 * Logout user
 * POST /api/users/logout
 * Note: Since JWT tokens are stateless, logout is handled client-side by removing the token.
 * This endpoint confirms the logout and can be used for logging/auditing purposes.
 * Token is already verified by authenticateToken middleware, so req.user is available.
 */
const logoutUser = async (req, res) => {
    try {
        // Token is already verified by authenticateToken middleware
        // User info is available in req.user if needed for logging
        
        res.json({
            success: true,
            message: 'Logout successful'
        });
    } catch (error) {
        logError('user.logoutUser', error, {
            user_id: req.user?.user_id
        }, req);
        
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

/**
 * Get user profile
 * GET /api/users/profile
 */
const getProfile = async (req, res) => {
    try {
        // User is attached by authenticateToken middleware
        if (!req.user || !req.user.user_id) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        
        const userId = req.user.user_id;

        const user = await User.findByPk(userId, {
            attributes: { exclude: ['password_hash'] }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found with this ID'
            });
        }

        // Convert to plain object and add profile picture URL
        const userObj = user.toJSON();
        if (userObj.profile_picture) {
            // If it's a cloud URL, use it directly, otherwise use local path
            if (userObj.profile_picture.startsWith('http://') || userObj.profile_picture.startsWith('https://')) {
                userObj.profile_picture_url = userObj.profile_picture;
            } else {
                userObj.profile_picture_url = `${process.env.R2_PUBLIC_DOMAIN || ''}/Profile_Pictures/${userObj.profile_picture}`;
            }
        }

        res.json({
            success: true,
            user: userObj
        });

    } catch (error) {
        logError('user.getProfile', error, {
            user_id: req.user?.user_id
        }, req);
        
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

/**
 * Upload file to cloud storage
 */
const uploadToCloud = async (file, directory, filename) => {
    try {
        const key = `${directory}${filename}`;
        const command = new PutObjectCommand({
            Bucket: process.env.R2_BUCKET,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
        });
        await r2.send(command);
        const publicURL = `${process.env.R2_PUBLIC_DOMAIN}/${key}`;
        return { key, url: publicURL };
    } catch (error) {
        console.error('Cloud upload error:', error);
        throw error;
    }
};

/**
 * Update profile (name, picture, schedule)
 * PUT /api/users/profile
 */
const updateProfile = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { full_name } = req.body;
        const profilePictureFile = req.files?.profile_picture ? req.files.profile_picture[0] : null;
        const scheduleFile = req.files?.schedule ? req.files.schedule[0] : null;

        // Get user
        const user = await User.findByPk(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Prepare update data
        const updateData = {};
        if (full_name) updateData.full_name = full_name;

        // Handle profile picture upload
        if (profilePictureFile) {
            // Validate file type (images only)
            if (!profilePictureFile.mimetype.startsWith('image/')) {
                return res.status(400).json({
                    success: false,
                    error: 'Profile picture must be an image file'
                });
            }

            // Generate filename for profile picture
            const ext = path.extname(profilePictureFile.originalname);
            const timestamp = Date.now();
            const randomStr = Math.random().toString(36).substring(2, 8);
            const filename = `${user.university_id}_${timestamp}_${randomStr}${ext}`;

            // Upload to cloud storage
            const uploadResult = await uploadToCloud(profilePictureFile, 'Profile_Pictures/', filename);
            updateData.profile_picture = uploadResult.url;
        }

        // Handle schedule upload
        if (scheduleFile) {
            // Validate file type (PDF only)
            if (scheduleFile.mimetype !== 'application/pdf') {
                return res.status(400).json({
                    success: false,
                    error: 'Schedule must be a PDF file'
                });
            }

            // Generate filename: user.name_user.universityId_StudentSchedule.pdf
            const sanitizedName = (user.full_name || 'User').replace(/[^a-zA-Z0-9]/g, '_');
            const sanitizedUniversityId = (user.university_id || '').replace(/[^a-zA-Z0-9]/g, '_');
            const filename = `${sanitizedName}_${sanitizedUniversityId}_StudentSchedule.pdf`;

            // Upload to cloud storage
            const uploadResult = await uploadToCloud(scheduleFile, 'Student_Schedules/', filename);
            updateData.schedule = uploadResult.url;
        }

        // Update user
        await user.update(updateData);

        // Get updated user (without password)
        const updatedUser = await User.findByPk(userId, {
            attributes: { exclude: ['password_hash'] }
        });

        // Convert to plain object and add profile picture URL
        const userObj = updatedUser.toJSON();
        if (userObj.profile_picture) {
            // If it's already a full URL, use it, otherwise construct it
            if (userObj.profile_picture.startsWith('http://') || userObj.profile_picture.startsWith('https://')) {
                userObj.profile_picture_url = userObj.profile_picture;
            } else {
                userObj.profile_picture_url = `${process.env.R2_PUBLIC_DOMAIN || ''}/Profile_Pictures/${userObj.profile_picture}`;
            }
        }

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: userObj
        });

    } catch (error) {
        logError('user.updateProfile', error, {
            user_id: req.user?.user_id
        }, req);
        
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

/**
 * Add score (for leaderboard)
 * POST /api/users/score
 */
const addScore = async (req, res) => {
    try {
        const { user_id, points } = req.body;

        // Validation
        if (!user_id || points === undefined) {
            return res.status(400).json({
                success: false,
                error: 'user_id and points are required'
            });
        }

        if (typeof points !== 'number' || points < 0) {
            return res.status(400).json({
                success: false,
                error: 'Points must be a positive number'
            });
        }

        // Get user
        const user = await User.findByPk(user_id);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Update score
        const newScore = (user.score || 0) + points;
        await user.update({ score: newScore });

        res.json({
            success: true,
            message: 'Score updated',
            user_id: user_id,
            new_score: newScore
        });

    } catch (error) {
        logError('user.addScore', error, {
            user_id: req.body?.user_id
        }, req);
        
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

module.exports = {
    registerUser,
    loginUser,
    logoutUser,
    getProfile,
    updateProfile,
    addScore
};

