# MSP-MIU Website

Official MSP-MIU Club Website - A full-stack platform for managing members, sessions, events, exercises, and leaderboards with role-based admin dashboards.

## 🛠️ Built With

![React](https://img.shields.io/badge/React-18.3.1-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18.0.0-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.19.2-000000?style=for-the-badge&logo=express&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-7.1.9-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Sequelize](https://img.shields.io/badge/Sequelize-6.37-52B0E7?style=for-the-badge&logo=sequelize&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-Auth-000000?style=for-the-badge&logo=json-web-tokens&logoColor=white)

## 🚀 Tech Stack

### Frontend
- ⚛️ **React 18** - UI library
- ⚡ **Vite** - Build tool and dev server
- 🛣️ **React Router** - Client-side routing
- 🎬 **Framer Motion** - Animation library
- 📡 **Axios** - HTTP client
- 🎨 **React Icons** - Icon library

### Backend
- 🟢 **Node.js** - Runtime environment
- 🚂 **Express** - Web framework
- 🗄️ **Sequelize** - ORM for MySQL
- 🐬 **MySQL** - Database
- 🔑 **JWT** - Authentication
- 🔒 **bcrypt** - Password hashing
- 📤 **Multer** - File upload handling
- 📧 **Nodemailer** - Email functionality

## 📁 Project Structure

```
Back-End/
├── app.js                 # Main application entry point
├── package.json           # Root package configuration
├── client/                # React frontend application
│   ├── src/
│   │   ├── components/    # Reusable React components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API service layer
│   │   ├── layoutpages/   # Layout components (Navbar, Footer)
│   │   └── assets/        # Static assets (images, CSS)
│   └── package.json
├── server/                # Express backend application
│   ├── config/            # Configuration files
│   │   └── db.js          # Database configuration
│   ├── controllers/       # Route controllers
│   │   ├── auth.js        # Authentication logic
│   │   ├── applications.js
│   │   ├── board.js
│   │   ├── members.js
│   │   └── user.js
│   ├── middlewares/       # Express middlewares
│   │   └── auth.js        # JWT authentication middleware
│   ├── models/            # Sequelize models
│   │   ├── Application.js
│   │   ├── Attendance.js
│   │   ├── Board.js
│   │   ├── Department.js
│   │   ├── Event.js
│   │   ├── Leaderboard.js
│   │   ├── Member.js
│   │   ├── PasswordToken.js
│   │   ├── Session.js
│   │   ├── Sponsor.js
│   │   ├── Suggestion.js
│   │   ├── User.js
│   │   └── index.js       # Model associations
│   ├── routes/            # API routes
│   │   ├── auth.js
│   │   ├── applications.js
│   │   ├── board.js
│   │   ├── members.js
│   │   └── user.js
│   ├── scripts/           # Utility scripts
│   │   ├── sendAcceptanceEmails.mjs
│   │   ├── sendActivationEmails.mjs
│   │   ├── sendBoardActivationEmails.mjs
│   │   └── MemberInsertion.js
│   ├── utils/             # Utility functions
│   │   ├── email.mjs      # Email service
│   │   ├── jwt.js         # JWT utilities
│   │   ├── logger.js      # Logging utility
│   │   └── upload.js      # File upload utility
│   ├── uploads/           # Uploaded files directory
│   └── server.js          # Server route definitions
├── scripts/               # Root-level scripts
│   └── pdfparse.py        # PDF parsing utility
└── uploads/               # Root uploads directory
```

## 🎯 Features

- 🔐 **User Authentication**: JWT-based authentication with account activation
- 👥 **Member Management**: Registration, applications, and member profiles
- 🎖️ **Board Management**: Board member profiles and department assignments
- 📅 **Event Management**: Create and manage club events
- ✅ **Session & Attendance**: Track sessions and member attendance
- 🏆 **Leaderboard**: Member ranking system
- 💡 **Suggestions**: Member suggestion system
- 🤝 **Sponsors**: Sponsor management
- 💪 **Exercises**: Exercise tracking and management
- 🎛️ **Admin Dashboard**: Role-based admin interface
- 📨 **Email Notifications**: Automated emails for activation, acceptance, etc.
- 📎 **File Uploads**: Profile pictures and document uploads

## 📋 Prerequisites

- 🟢 **Node.js** >= 18.0.0
- 📦 **npm** >= 8.0.0
- 🐬 **MySQL** database
- 📧 **SMTP** email server (for email functionality)

## ⚙️ Installation

1. 📥 **Clone the repository**
   ```bash
   git clone https://github.com/MSP-Tech-Club-MIU/msp-miu-website.git
   cd msp-miu-website/main
   ```

2. 📦 **Install dependencies**
   ```bash
   npm run install:all
   ```
   This will install dependencies for root, client, and server.

3. ⚙️ **Environment Configuration**

   Create a `.env` file in the root directory with the following variables:

   ```env
   # Server Configuration
   PORT=3000
   NODE_ENV=development

   # Database Configuration
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=msp_miu_db
   DB_USER=your_db_user
   DB_PASS=your_db_password

   # JWT Configuration
   JWT_SECRET=your_jwt_secret_key
   
   # Email Configuration (SMTP)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_email_password
   SMTP_FROM_NAME=MSP MIU Website

   # Website URLs
   WEBSITE_URL=http://localhost:3000
   FRONTEND_URL=http://localhost:5173
   ```

4. 🗄️ **Database Setup**

   Create a MySQL database and update the `.env` file with your database credentials. The application will automatically sync models on startup.

## 🏃 Running the Application

### Development Mode

Run both frontend and backend concurrently:

```bash
npm run dev
```

This will start:
- 🔧 Backend server on `http://localhost:3000`
- 🎨 Frontend dev server on `http://localhost:5173`

### Run Separately

**🔧 Backend only:**
```bash
npm run dev:server
```

**🎨 Frontend only:**
```bash
npm run dev:client
```

### Production Mode

1. 🏗️ **Build the frontend:**
   ```bash
   npm run build
   ```

2. 🚀 **Start the server:**
   ```bash
   npm start
   ```

## 📜 Available Scripts

### Root Scripts
- 🚀 `npm run dev` - Run both client and server in development mode
- 🔧 `npm run dev:server` - Run server in development mode with nodemon
- 🎨 `npm run dev:client` - Run client in development mode
- 🏗️ `npm run build` - Build client for production
- 📦 `npm run build:client` - Build client with dev dependencies
- ▶️ `npm start` - Start production server
- 🔧 `npm run start:server` - Start server only
- 📥 `npm run install:all` - Install all dependencies
- 🧹 `npm run clean` - Remove all node_modules
- 🚀 `npm run deploy` - Build and start production server
- 🧪 `npm test` - Run client tests
- 🔍 `npm run lint` - Lint client code

### Server Scripts
- 📧 `npm run send-activation-emails` - Send account activation emails
- ✅ `npm run send-acceptance-emails` - Send acceptance emails
- 🎖️ `npm run send-board-activation-emails` - Send board activation emails

## 🗄️ Database Models

- 👤 **User** - User accounts and authentication
- 👥 **Member** - Club members
- 🎖️ **Board** - Board members
- 🏢 **Department** - Club departments
- 📝 **Application** - Member applications
- 📅 **Event** - Club events
- 🎓 **Session** - Training sessions
- ✅ **Attendance** - Session attendance records
- 🏆 **Leaderboard** - Member rankings
- 🤝 **Sponsor** - Club sponsors
- 💡 **Suggestion** - Member suggestions
- 🔑 **PasswordToken** - Password reset tokens

## 🔐 Authentication

The application uses JWT (JSON Web Tokens) for authentication. Protected routes require a valid JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## 📧 Email Functionality

The application supports automated emails for:
- Account activation
- Acceptance notifications
- Board activation
- Password reset (if implemented)

Configure SMTP settings in the `.env` file to enable email functionality.

## 📁 File Uploads

Uploaded files (profile pictures, documents) are stored in:
- `server/uploads/` - Server uploads directory
- Files are served at `/uploads` endpoint

## 🔌 API Routes

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/activate` - Activate account
- `POST /api/auth/verify-activation-token` - Verify activation token

### Applications
- `POST /api/applications` - Create application
- `GET /api/applications` - Get all applications
- `PUT /api/applications/:id/status` - Update application status
- `PUT /api/applications/:id/comment` - Update application comment
- `DELETE /api/applications/:id` - Delete application

### Members
- See `server/routes/members.js` for member routes

### Board
- See `server/routes/board.js` for board routes

### Users
- See `server/routes/user.js` for user routes

## 🛠️ Development

### Code Structure

- **Controllers**: Handle business logic and database operations
- **Routes**: Define API endpoints and middleware
- **Models**: Define database schema and relationships
- **Middlewares**: Handle authentication and request processing
- **Utils**: Utility functions for common operations

### Adding New Features

1. Create model in `server/models/`
2. Define routes in `server/routes/`
3. Implement controller in `server/controllers/`
4. Add associations in `server/models/index.js`
5. Create frontend components in `client/src/`
6. Add API calls in `client/src/services/api.js`

## 📝 Notes

- The application uses Sequelize for database operations
- Database models are automatically synchronized on server start
- File uploads use Multer for handling multipart/form-data
- Email functionality requires SMTP configuration
- JWT tokens are used for stateless authentication

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - See LICENSE file for details

## 👥 Authors

MSP MIU Team

---

For more information, visit [MSP MIU Website](https://msp-miu.tech)
