/**
 * JWT Utility
 * Provides secure JWT token generation with validation
 */

const jwt = require('jsonwebtoken');
const logger = require('./logger');

/**
 * Validate JWT secret is properly set and meets security requirements
 * @param {boolean} strict - If false, allows shorter secrets (for backward compatibility)
 * @returns {Object} - { valid: boolean, secret: string, error?: string }
 */
const validateJWTSecret = (strict = true) => {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        return {
            valid: false,
            secret: null,
            error: 'JWT_SECRET environment variable is not set'
        };
    }

    if (typeof secret !== 'string') {
        return {
            valid: false,
            secret: null,
            error: 'JWT_SECRET must be a string'
        };
    }

    // Minimum length requirement for security (at least 32 characters)
    // In strict mode, enforce 32 chars. In non-strict mode, allow 16+ chars as minimum
    const minLength = strict ? 32 : 16;
    if (secret.length < minLength) {
        return {
            valid: false,
            secret: null,
            error: `JWT_SECRET must be at least ${minLength} characters long for security (current: ${secret.length})`
        };
    }

    // Check for common weak secrets (exact matches only, not substrings)
    // This prevents flagging valid secrets that happen to contain these words
    const weakSecrets = ['secret', 'password', '123456', 'jwt_secret', 'changeme', 'test', 'default'];
    const secretLower = secret.toLowerCase().trim();
    
    // Only flag if it's an exact match to a known weak secret
    if (weakSecrets.includes(secretLower)) {
        return {
            valid: false,
            secret: null,
            error: 'JWT_SECRET appears to be a weak or default value'
        };
    }
    
    // Check if secret is just a repetition of a single character (too predictable)
    // Only check if secret is long enough for this pattern to be meaningful
    if (secret.length >= 32 && secretLower.match(/^(.)\1{31,}$/)) {
        return {
            valid: false,
            secret: null,
            error: 'JWT_SECRET appears to be too simple or predictable'
        };
    }

    return {
        valid: true,
        secret: secret
    };
};

/**
 * Get JWT expiration time with fallback
 * @returns {string} - JWT expiration time (default: '7d')
 */
const getJWTExpiration = () => {
    const expiresIn = process.env.JWT_EXPIRES_IN;
    
    // Validate expiration format if provided
    if (expiresIn) {
        // Basic validation: should be a number followed by a time unit (s, m, h, d)
        const expirationRegex = /^\d+[smhd]$/;
        if (!expirationRegex.test(expiresIn)) {
            logger.warn(`Invalid JWT_EXPIRES_IN format: ${expiresIn}. Using default: 7d`);
            return '7d';
        }
        return expiresIn;
    }

    // Default to 7 days
    return '7d';
};

/**
 * Generate JWT token with validation
 * @param {Object} payload - Token payload
 * @param {string} customExpiresIn - Optional custom expiration time (e.g., '1h', '30m', '7d')
 * @returns {Object} - { success: boolean, token?: string, error?: string }
 */
const generateToken = (payload, customExpiresIn = null) => {
    try {
        // Get JWT secret from environment
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            return {
                success: false,
                error: 'JWT_SECRET environment variable is not set'
            };
        }

        // Validate JWT secret - use non-strict mode for backward compatibility
        // This allows existing deployments with shorter secrets to continue working
        const secretValidation = validateJWTSecret(false);
        if (!secretValidation.valid) {
            // If validation fails, check if we can still use it (minimum 16 chars for backward compatibility)
            if (secret.length < 16) {
                return {
                    success: false,
                    error: secretValidation.error
                };
            }
            // Log warning but continue for backward compatibility
            logger.warn(`[JWT] Secret validation warning: ${secretValidation.error}. Using secret anyway for backward compatibility.`);
        }

        // Validate payload
        if (!payload || typeof payload !== 'object') {
            return {
                success: false,
                error: 'Invalid token payload'
            };
        }

        // Get expiration time - use custom if provided, otherwise use default
        let expiresIn = customExpiresIn || getJWTExpiration();
        
        // Validate custom expiration format if provided
        if (customExpiresIn) {
            const expirationRegex = /^\d+[smhd]$/;
            if (!expirationRegex.test(customExpiresIn)) {
                return {
                    success: false,
                    error: `Invalid expiration format: ${customExpiresIn}. Expected format: number followed by s, m, h, or d (e.g., '1h', '30m')`
                };
            }
        }

        // Generate token using the secret (either validated or from env)
        const token = jwt.sign(
            payload,
            secret,
            { expiresIn }
        );

        return {
            success: true,
            token
        };
    } catch (error) {
        return {
            success: false,
            error: `Token generation failed: ${error.message}`
        };
    }
};

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} - { success: boolean, decoded?: Object, error?: string }
 */
const verifyToken = (token) => {
    try {
        // Validate JWT secret - use non-strict mode for backward compatibility
        const secretValidation = validateJWTSecret(false);
        const secret = process.env.JWT_SECRET;
        
        if (!secret) {
            return {
                success: false,
                error: 'JWT_SECRET environment variable is not set'
            };
        }
        
        // If validation fails but secret exists and is at least 16 chars, use it anyway
        if (!secretValidation.valid) {
            if (secret.length < 16) {
                return {
                    success: false,
                    error: secretValidation.error
                };
            }
            // Log warning but continue for backward compatibility
            logger.warn(`[JWT] Secret validation warning: ${secretValidation.error}. Using secret anyway.`);
        }

        if (!token || typeof token !== 'string') {
            return {
                success: false,
                error: 'Invalid token format'
            };
        }

        // Verify token - use validated secret or fall back to process.env.JWT_SECRET
        const secretToUse = secretValidation.valid ? secretValidation.secret : secret;
        const decoded = jwt.verify(token, secretToUse);
        return {
            success: true,
            decoded
        };
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return {
                success: false,
                error: 'Invalid token'
            };
        }
        if (error.name === 'TokenExpiredError') {
            return {
                success: false,
                error: 'Token expired'
            };
        }
        return {
            success: false,
            error: `Token verification failed: ${error.message}`
        };
    }
};

module.exports = {
    validateJWTSecret,
    getJWTExpiration,
    generateToken,
    verifyToken
};

