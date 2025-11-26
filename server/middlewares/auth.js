const { User } = require('../models');
const { verifyToken, validateJWTSecret } = require('../utils/jwt');
const { logError, logSecurityEvent } = require('../utils/logger');

/**
 * JWT Authentication Middleware
 * Verifies JWT token from Authorization header and attaches user to request
 */
const authenticateToken = async (req, res, next) => {
    try {
        // Check if JWT_SECRET exists (required)
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            logSecurityEvent('AUTH_CONFIG_ERROR', {
                reason: 'JWT_SECRET is not set'
            }, req);
            
            return res.status(500).json({
                success: false,
                error: 'Authentication service configuration error'
            });
        }
        
        // Validate JWT secret (non-strict mode for backward compatibility)
        const secretValidation = validateJWTSecret(false);
        if (!secretValidation.valid && secret.length < 16) {
            logSecurityEvent('AUTH_CONFIG_ERROR', {
                reason: 'JWT_SECRET validation failed',
                error: secretValidation.error
            }, req);
            
            return res.status(500).json({
                success: false,
                error: 'Authentication service configuration error'
            });
        }

        // Get token from Authorization header
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Access token required'
            });
        }

        // Verify token using utility
        const tokenResult = verifyToken(token);
        if (!tokenResult.success) {
            if (tokenResult.error === 'Token expired') {
                logSecurityEvent('TOKEN_EXPIRED', {
                    token_prefix: token.substring(0, 10) + '...'
                }, req);
                
                return res.status(403).json({
                    success: false,
                    error: 'Token expired'
                });
            }
            
            logSecurityEvent('INVALID_TOKEN', {
                token_prefix: token.substring(0, 10) + '...',
                error: tokenResult.error
            }, req);
            
            return res.status(403).json({
                success: false,
                error: 'Invalid token'
            });
        }

        // Get user from database
        // Handle both userId (new format) and id (old format) for backward compatibility
        const userId = tokenResult.decoded.userId || tokenResult.decoded.id;
        const user = await User.findByPk(userId, {
            attributes: { exclude: ['password_hash'] }
        });

        if (!user) {
            logSecurityEvent('USER_NOT_FOUND', {
                user_id: userId
            }, req);
            
            return res.status(401).json({
                success: false,
                error: 'User not found'
            });
        }

        if (!user.is_active) {
            logSecurityEvent('AUTH_BLOCKED', {
                reason: 'Account inactive',
                user_id: user.user_id
            }, req);
            
            return res.status(403).json({
                success: false,
                error: 'User account is inactive'
            });
        }

        // Attach user to request
        req.user = user;
        next();
    } catch (error) {
        logError('middleware.authenticateToken', error, {
            has_token: !!req.headers['authorization']
        }, req);
        
        return res.status(500).json({
            success: false,
            error: 'Authentication error'
        });
    }
};

/**
 * Role-based authorization middleware
 * Checks if user has required role(s)
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions'
            });
        }

        next();
    };
};

/**
 * Verify role middleware (alias for authorize)
 * Checks if user has required role(s)
 */
const verifyRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }

        next();
    };
};

const verifyDepartment = (...departments) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        // Check department_id field (not department)
        const userDepartment = req.user.department_id || req.user.department;
        if (!departments.includes(userDepartment)) {
            return res.status(403).json({
                success: false,
                error: 'Department not allowed'
            });
        }
        next();
    };
};

/**
 * Verify role OR department middleware
 * Allows access if user has required role(s) OR department(s)
 */
const verifyRoleOrDepartment = (roles, departments) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        // Check if user has required role
        const hasRole = roles && roles.includes(req.user.role);
        
        // Check if user has required department
        const userDepartment = req.user.department_id || req.user.department;
        const hasDepartment = departments && departments.includes(userDepartment);

        // Allow if user has required role OR department
        if (hasRole || hasDepartment) {
            return next();
        }

        return res.status(403).json({
            success: false,
            error: 'Access denied'
        });
    };
};
/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't require it
 * Logs errors for security monitoring without blocking the request
 */
const optionalAuth = async (req, res, next) => {
    try {
        // Check if JWT_SECRET exists
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            // Log but don't block - this is optional auth
            logSecurityEvent('OPTIONAL_AUTH_CONFIG_ERROR', {
                reason: 'JWT_SECRET is not set'
            }, req);
            return next();
        }
        
        // Validate JWT secret (non-strict mode)
        const secretValidation = validateJWTSecret(false);
        // Don't block even if validation fails - just log it
        if (!secretValidation.valid && secret.length < 16) {
            logSecurityEvent('OPTIONAL_AUTH_CONFIG_ERROR', {
                reason: 'JWT_SECRET validation failed',
                error: secretValidation.error
            }, req);
            return next();
        }

        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            // Verify token using utility
            const tokenResult = verifyToken(token);
            
            if (tokenResult.success) {
                const userId = tokenResult.decoded.userId || tokenResult.decoded.id;
                const user = await User.findByPk(userId, {
                    attributes: { exclude: ['password_hash'] }
                });
                
                if (user && user.is_active) {
                    req.user = user;
                } else if (user && !user.is_active) {
                    // Log inactive user attempt but don't block
                    logSecurityEvent('OPTIONAL_AUTH_INACTIVE_USER', {
                        user_id: user.user_id
                    }, req);
                }
            } else {
                // Log token validation errors for security monitoring
                // But don't block the request since this is optional auth
                const errorType = tokenResult.error === 'Token expired' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
                logSecurityEvent(`OPTIONAL_AUTH_${errorType}`, {
                    token_prefix: token.substring(0, 10) + '...',
                    error: tokenResult.error
                }, req);
            }
        }
        next();
    } catch (error) {
        // Log unexpected errors for debugging and security monitoring
        // But continue without user since this is optional auth
        logError('middleware.optionalAuth', error, {
            has_auth_header: !!req.headers['authorization']
        }, req);
        next();
    }
};

module.exports = {
    authenticateToken,
    authorize,
    verifyRole,
    optionalAuth,
    verifyDepartment,
    verifyRoleOrDepartment
};

