# Security Policy

## Overview

This document outlines the security measures, best practices, and policies for the MSP MIU Website project. It covers authentication, authorization, data protection, and security incident reporting.

## Table of Contents

1. [Authentication & Authorization](#authentication--authorization)
2. [Password Security](#password-security)
3. [JWT Token Security](#jwt-token-security)
4. [Input Validation](#input-validation)
5. [SQL Injection Prevention](#sql-injection-prevention)
6. [Cross-Site Scripting (XSS) Prevention](#cross-site-scripting-xss-prevention)
7. [CORS Configuration](#cors-configuration)
8. [Security Logging & Monitoring](#security-logging--monitoring)
9. [Environment Variables](#environment-variables)
10. [Best Practices](#best-practices)
11. [Known Security Issues & Fixes](#known-security-issues--fixes)
12. [Reporting Security Vulnerabilities](#reporting-security-vulnerabilities)

---

## Authentication & Authorization

### JWT-Based Authentication

The application uses JSON Web Tokens (JWT) for stateless authentication.

**Implementation:**
- Tokens are generated using `jsonwebtoken` library
- Tokens include user ID, role, and department information
- Tokens are validated on every protected route via middleware
- Token expiration is enforced (default: 24 hours)

**Security Features:**
- JWT secret validation (minimum 16 characters)
- Token verification before processing requests
- User account status checks (active/inactive)
- Role-based access control (member, board, admin)

**Middleware:** `server/middlewares/auth.js`

### Protected Routes

All sensitive endpoints require authentication:
- User profile management
- Admin operations
- Board member operations
- Member management

---

## Password Security

### Password Hashing

**Algorithm:** bcrypt with 10 salt rounds

**Implementation:**
```javascript
const saltRounds = 10;
const password_hash = await bcrypt.hash(password, saltRounds);
```

**Security Features:**
- Passwords are never stored in plain text
- bcrypt automatically handles salt generation
- Password comparison uses constant-time comparison
- Minimum password length: 6 characters (consider increasing to 8+)

### Password Reset Security

**Token-Based Reset:**
- Password reset tokens are JWT-based with 1-hour expiration
- Tokens are stored in database with expiration timestamps
- Tokens are marked as "used" after successful reset
- Tokens are validated both cryptographically and in database

**Security Measures:**
- Generic error messages (don't reveal if email exists)
- Token expiration enforcement
- One-time use tokens
- Database validation of token status

**Location:** `server/controllers/auth.js` - `forgotPassword()` and `resetPassword()`

---

## JWT Token Security

### Token Generation

**Requirements:**
- JWT_SECRET must be set in environment variables
- JWT_SECRET must be at least 16 characters long
- Secret validation on application startup

**Token Payload:**
```javascript
{
  id: user.user_id,
  userId: user.user_id,
  role: user.role,
  department: user.department_id
}
```

### Token Verification

**Process:**
1. Extract token from `Authorization: Bearer <token>` header
2. Verify token signature using JWT_SECRET
3. Check token expiration
4. Validate user exists and is active
5. Attach user object to request

**Error Handling:**
- Invalid tokens return 403 Forbidden
- Expired tokens return 403 Forbidden
- Missing tokens return 401 Unauthorized
- All token failures are logged for security monitoring

**Location:** `server/middlewares/auth.js` - `authenticateToken()`

---

## Input Validation

### Server-Side Validation

**University ID Format:**
- Pattern: `^\d{4}\/\d{5}$` (e.g., 2024/12345)
- Validated on login and registration
- Prevents injection of malformed data

**Email Validation:**
- Pattern: `^[^\s@]+@[^\s@]+\.[^\s@]+$`
- Validated on registration and password reset

**Password Validation:**
- Minimum length: 6 characters
- Required on registration, password change, and reset

**Input Sanitization:**
- All user inputs are validated before database operations
- Sequelize ORM provides parameterized queries (prevents SQL injection)
- No raw SQL queries with user input

**Location:** `server/controllers/auth.js`

---

## SQL Injection Prevention

### ORM Usage

**Sequelize ORM:**
- All database queries use Sequelize ORM
- Parameterized queries are used automatically
- No raw SQL queries with user input

**Example:**
```javascript
// Safe - Sequelize handles parameterization
const user = await User.findOne({ where: { university_id } });

// Safe - Parameterized query
const user = await User.findByPk(userId);
```

**Best Practices:**
- Never use string concatenation for SQL queries
- Always use Sequelize methods for database operations
- Validate input before database queries

---

## Cross-Site Scripting (XSS) Prevention

### Frontend Protection

**React's Built-in Protection:**
- React automatically escapes values in JSX
- Prevents XSS attacks by default

**Best Practices:**
- Never use `dangerouslySetInnerHTML` with user input
- Sanitize any user-generated content before display
- Use Content Security Policy (CSP) headers

### Backend Protection

**Response Headers:**
- Consider implementing CSP headers
- Set appropriate `X-Content-Type-Options` header
- Use `X-Frame-Options` to prevent clickjacking

---

## CORS Configuration

### Current Implementation

**Status:** Basic CORS enabled

**Configuration:**
```javascript
app.use(cors());
```

**Recommendations:**
- Configure specific allowed origins instead of allowing all
- Set appropriate CORS headers for production
- Consider implementing preflight request handling

**Example Secure Configuration:**
```javascript
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
```

---

## Security Logging & Monitoring

### Audit Logging

**Security Events Logged:**
- Login attempts (success/failure)
- Token verification failures
- Password reset attempts
- Account activation attempts
- Authentication errors
- Authorization failures

**Logging Functions:**
- `logAuditEvent()` - General audit events
- `logSecurityEvent()` - Security-specific events
- `logError()` - Error logging with context

**Location:** `server/utils/logger.js`

### Logged Information

**Security Events Include:**
- User ID (when available)
- University ID (when available)
- IP address (from request)
- Timestamp
- Event type
- Error details (when applicable)

**Privacy Considerations:**
- Passwords are never logged
- Sensitive data is excluded from logs
- Token prefixes only (not full tokens)

---

## Environment Variables

### Required Security Variables

**JWT_SECRET**
- **Required:** Yes
- **Minimum Length:** 16 characters
- **Purpose:** Signing and verifying JWT tokens
- **Security:** Must be kept secret, never commit to version control

**Database Credentials**
- **DB_HOST**
- **DB_USER**
- **DB_PASSWORD**
- **DB_NAME**
- **Security:** Store in `.env` file, never commit

**Email Configuration**
- **SMTP_HOST**
- **SMTP_PORT**
- **SMTP_USER**
- **SMTP_PASS**
- **Security:** Use secure SMTP connections (TLS/SSL)

### Environment File Security

**Best Practices:**
- Never commit `.env` files to version control
- Use `.env.example` for documentation
- Rotate secrets regularly
- Use different secrets for development and production

---

## Best Practices

### Code Security

1. **Always validate input** on the server side
2. **Use parameterized queries** (Sequelize handles this)
3. **Hash passwords** before storing (bcrypt)
4. **Verify tokens** on every protected route
5. **Log security events** for monitoring
6. **Use HTTPS** in production
7. **Keep dependencies updated** (regular security audits)
8. **Implement rate limiting** (recommended for login endpoints)

### Development Security

1. **Never commit secrets** to version control
2. **Use environment variables** for configuration
3. **Review code changes** before merging
4. **Test security features** regularly
5. **Keep dependencies updated**

### Production Security

1. **Use strong JWT secrets** (32+ characters recommended)
2. **Enable HTTPS** with valid SSL certificates
3. **Configure CORS** properly
4. **Implement rate limiting** on authentication endpoints
5. **Regular security audits** of dependencies
6. **Monitor security logs** regularly
7. **Backup database** regularly
8. **Keep server software updated**

---

## Known Security Issues & Fixes

### Fixed Issues

#### 1. Token Verification Function Naming Conflict
**Issue:** `verifyToken` was both imported and declared as a function handler, causing a naming conflict.

**Fix:** Renamed imported function to `verifyJWTToken` to avoid conflict.

**Location:** `server/controllers/auth.js` line 3, 1220

**Status:** ✅ Fixed

#### 2. Password Reset Token Security
**Issue:** Tokens were only validated cryptographically, not checked in database.

**Fix:** Implemented database validation to ensure tokens are:
- Not already used
- Not expired (database check)
- Valid for the specific user

**Location:** `server/controllers/auth.js` - `resetPassword()`

**Status:** ✅ Fixed

### Recommendations for Improvement

1. **Rate Limiting**
   - Implement rate limiting on login endpoints
   - Prevent brute force attacks
   - Consider using `express-rate-limit`

2. **Password Strength**
   - Increase minimum password length to 8+ characters
   - Consider adding password complexity requirements
   - Implement password history (prevent reuse)

3. **Session Management**
   - Implement token refresh mechanism
   - Add token revocation capability
   - Consider shorter token expiration times

4. **CORS Configuration**
   - Configure specific allowed origins
   - Remove wildcard CORS in production

5. **Security Headers**
   - Implement Content Security Policy (CSP)
   - Add X-Frame-Options header
   - Add X-Content-Type-Options header

6. **Input Validation**
   - Add more comprehensive input sanitization
   - Implement request size limits
   - Add file upload validation

---

## Reporting Security Vulnerabilities

### How to Report

If you discover a security vulnerability, please follow these steps:

1. **Do NOT** create a public GitHub issue
2. **Email** the security team at: [MSP@msp-miu.tech]
3. **Include** the following information:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### Response Timeline

- **Initial Response:** Within 48 hours
- **Status Update:** Within 7 days
- **Fix Timeline:** Depends on severity

### Responsible Disclosure

We follow responsible disclosure practices:
- We will acknowledge your report
- We will work with you to understand and resolve the issue
- We will credit you for the discovery (if desired)
- We will not take legal action against security researchers acting in good faith

---

## Security Checklist

### Before Deployment

- [ ] All environment variables are set
- [ ] JWT_SECRET is strong (32+ characters)
- [ ] Database credentials are secure
- [ ] HTTPS is enabled
- [ ] CORS is properly configured
- [ ] Security headers are set
- [ ] Dependencies are updated
- [ ] Security logs are monitored
- [ ] Backups are configured
- [ ] Rate limiting is implemented (recommended)

### Regular Maintenance

- [ ] Review security logs weekly
- [ ] Update dependencies monthly
- [ ] Rotate secrets quarterly
- [ ] Review access logs monthly
- [ ] Security audit annually

---

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [bcrypt Documentation](https://www.npmjs.com/package/bcrypt)

---

## Version History

- **v1.0.0** (2024) - Initial security documentation

---

**Last Updated:** 11/16/2025

**Maintained By:** MSP MIU Development Team

