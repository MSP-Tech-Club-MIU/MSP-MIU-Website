# Postman Testing Guide - Registration API

## Prerequisites
1. Make sure your server is running
2. Default server URL: `http://localhost:5000` (or check your `.env` file for `PORT`)
3. Have Postman installed

## Testing Registration API

### Endpoint Details
- **Method:** `POST`
- **URL:** `http://localhost:5000/api/users/register`
- **Content-Type:** `application/json`

### Step-by-Step Instructions

#### 1. Open Postman
- Launch Postman application

#### 2. Create a New Request
- Click "New" → "HTTP Request"
- Or use the shortcut: `Ctrl+N` (Windows/Linux) or `Cmd+N` (Mac)

#### 3. Configure the Request
- **Method:** Select `POST` from the dropdown
- **URL:** Enter `http://localhost:5000/api/users/register`

#### 4. Set Headers
- Click on the "Headers" tab
- Add the following header:
  - **Key:** `Content-Type`
  - **Value:** `application/json`

#### 5. Set Request Body
- Click on the "Body" tab
- Select "raw" option
- From the dropdown on the right, select "JSON"
- Enter the following JSON in the body:

```json
{
  "full_name": "John Doe",
  "university_id": "2023/03479",
  "email": "john.doe@example.com",
  "password": "password123"
}
```

#### 6. Send the Request
- Click the "Send" button
- Wait for the response

### Expected Responses

#### ✅ Success Response (201 Created)
```json
{
  "success": true,
  "message": "Account created successfully",
  "user_id": 1
}
```

#### ❌ Error Responses

**Missing Fields (400 Bad Request)**
```json
{
  "success": false,
  "error": "All fields are required: full_name, university_id, email, password"
}
```

**Invalid Email Format (400 Bad Request)**
```json
{
  "success": false,
  "error": "Invalid email format"
}
```

**Password Too Short (400 Bad Request)**
```json
{
  "success": false,
  "error": "Password must be at least 6 characters long"
}
```

**User Already Exists (409 Conflict)**
```json
{
  "success": false,
  "error": "User with this email or university ID already exists"
}
```

### Test Cases

#### Test Case 1: Valid Registration
```json
{
  "full_name": "Ahmed Mohamed",
  "university_id": "2023/03479",
  "email": "ahmed.mohamed@miuegypt.edu.eg",
  "password": "SecurePass123"
}
```

#### Test Case 2: Missing Field
```json
{
  "full_name": "Ahmed Mohamed",
  "university_id": "2023/03479",
  "email": "ahmed.mohamed@miuegypt.edu.eg"
  // Missing password
}
```

#### Test Case 3: Invalid Email
```json
{
  "full_name": "Ahmed Mohamed",
  "university_id": "2023/03480",
  "email": "invalid-email",
  "password": "SecurePass123"
}
```

#### Test Case 4: Short Password
```json
{
  "full_name": "Ahmed Mohamed",
  "university_id": "2023/03481",
  "email": "test@example.com",
  "password": "12345"
}
```

#### Test Case 5: Duplicate User
- First, register a user with university_id "2023/03482"
- Then try to register again with the same university_id or email

### Quick Test Collection

You can save these as a Postman Collection:

1. **Valid Registration**
   - Method: POST
   - URL: `http://localhost:5000/api/users/register`
   - Body: Valid JSON with all fields

2. **Invalid Registration - Missing Fields**
   - Method: POST
   - URL: `http://localhost:5000/api/users/register`
   - Body: JSON missing one or more fields

3. **Invalid Registration - Invalid Email**
   - Method: POST
   - URL: `http://localhost:5000/api/users/register`
   - Body: JSON with invalid email format

### Troubleshooting

#### Issue: Connection Refused
- **Solution:** Make sure your server is running
- Check if the port in the URL matches your server port
- Verify your `.env` file has the correct `PORT` value

#### Issue: CORS Error
- **Solution:** The server should have CORS enabled (already configured in `app.js`)

#### Issue: 500 Internal Server Error
- **Solution:** 
  - Check server console for error messages
  - Verify database connection
  - Check if all required environment variables are set

#### Issue: Database Error
- **Solution:**
  - Verify database is running
  - Check database credentials in `.env` file
  - Ensure the `users` table exists in the database

### Environment Variables Setup

Make sure your `.env` file has:
```
DB_HOST=localhost
DB_PORT=3306
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASS=your_database_password
PORT=5000
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
```

### Testing with Postman Environment

You can create a Postman Environment for easier testing:

1. Click on the gear icon (⚙️) in the top right
2. Click "Add" to create a new environment
3. Add variables:
   - `base_url`: `http://localhost:5000`
   - `api_url`: `http://localhost:5000/api`
4. Use variables in your requests: `{{api_url}}/users/register`

### Next Steps After Registration

After successfully registering a user, you can test the login endpoint:

**Login Endpoint:**
- **Method:** `POST`
- **URL:** `http://localhost:5000/api/users/login`
- **Body:**
```json
{
  "university_id": "2023/03479",
  "password": "password123"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "user_id": 1,
    "university_id": "2023/03479",
    "role": "member",
    "is_active": true,
    "department_id": null
  }
}
```

## Visual Guide

### Postman Request Configuration:
```
POST http://localhost:5000/api/users/register

Headers:
  Content-Type: application/json

Body (raw JSON):
{
  "full_name": "John Doe",
  "university_id": "2023/03479",
  "email": "john.doe@example.com",
  "password": "password123"
}
```

Save this request in Postman for quick testing!

