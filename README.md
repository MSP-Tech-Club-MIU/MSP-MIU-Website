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
![Capacitor](https://img.shields.io/badge/Capacitor-7.4.4-119EFF?style=for-the-badge&logo=capacitor&logoColor=white)
![Capacitor App](https://img.shields.io/badge/Capacitor%20App-7.0.0-119EFF?style=for-the-badge&logo=capacitor&logoColor=white)

## 🚀 Tech Stack

### Frontend
- ⚛️ **React 18** - UI library
- ⚡ **Vite** - Build tool and dev server
- 🛣️ **React Router** - Client-side routing
- 🎬 **Framer Motion** - Animation library
- 📡 **Axios** - HTTP client
- 🎨 **React Icons** - Icon library
- 📱 **Capacitor** - Cross-platform mobile app framework (Android & iOS)
- 🔙 **Android Back Button** - Native Android navigation handling

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
│   │   │   ├── BackButton.jsx                    # Navigation back button (fixed top-left)
│   │   │   ├── AndroidBackButtonHandler.jsx       # Android back button handler component
│   │   │   ├── AndroidBackButtonSetup.jsx         # Android back button setup component
│   │   │   └── ...                                # Other components
│   │   ├── pages/         # Page components (all include BackButton)
│   │   ├── hooks/         # Custom React hooks
│   │   │   └── useAndroidBackButton.js  # Android back button hook
│   │   ├── services/      # API service layer
│   │   ├── layoutpages/   # Layout components (Navbar, Footer)
│   │   ├── utils/         # Utility functions
│   │   │   └── androidBackButton.js    # Android back button utilities
│   │   └── assets/        # Static assets (images, CSS)
│   ├── android/           # Android native app (Capacitor)
│   ├── ios/               # iOS native app (Capacitor)
│   ├── capacitor.config.json  # Capacitor configuration
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

## 📷 Screenshots

### Landing page

![Landing page screenshot](client/src/assets/Images/MSP-MIU%20Website%20(1).png)

### Events page

![Events page screenshot](client/src/assets/Images/MSP-MIU%20Website%20(2).png)

### Single event page

![Single event screenshot](client/src/assets/Images/MSP-MIU%20Website%20(3).png)

### Download Android App page

![Download Android App screenshot](client/src/assets/Images/MSP-MIU%20Website%20(4).png)

### Profile page (Logged In as a Board Member)

![Profile page screenshot](client/src/assets/Images/MSP-MIU%20Website%20(5).png)

## 🎯 Features

- 🔐 **User Authentication**: JWT-based authentication with account activation
- 👥 **Member Management**: Registration, applications, and member profiles
- 🎖️ **Board Management**: Board member profiles and department assignments
- 📅 **Event Management**: Create and manage club events with file attachments
- ✅ **Session & Attendance**: Track sessions and member attendance requests
- 🏆 **Leaderboard**: Member ranking system
- 💡 **Suggestions**: Member suggestion system
- 🤝 **Sponsors**: Sponsor management
- 💪 **Exercises**: Exercise tracking and management
- 🎛️ **Admin Dashboard**: Role-based admin interface with application management
- 📨 **Email Notifications**: Automated emails for activation, acceptance, etc.
- 📎 **File Uploads**: Profile pictures and document uploads with cloud storage support
- 📱 **Mobile App**: Native Android and iOS apps built with Capacitor
- 🔙 **Android Navigation**: Native Android back button handling with modal/drawer support
- 📲 **Responsive Design**: Fully responsive UI optimized for all screen sizes (mobile, tablet, desktop)
- 🎨 **Consistent Navigation**: Back buttons on all pages with fixed top-left positioning
- 🎯 **Mobile-First UX**: Optimized mobile experience with touch-friendly interactions

## 📋 Prerequisites

- 🟢 **Node.js** >= 18.0.0
- 📦 **npm** >= 8.0.0
- 🐬 **MySQL** database
- 📧 **SMTP** email server (for email functionality)
- 📱 **For Mobile Development**:
  - **Android**: Android Studio with Android SDK (API level 24+)
  - **iOS**: Xcode 14+ (macOS only)
  - **Capacitor CLI**: `npm install -g @capacitor/cli`
  - **Java JDK**: Version 11 or higher (for Android)
  - **Gradle**: Included with Android project

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
   
   # Cloud Storage (R2) - Optional, for file uploads and CDN
   R2_ACCOUNT_ID=your_r2_account_id
   R2_ACCESS_KEY_ID=your_r2_access_key
   R2_SECRET_ACCESS_KEY=your_r2_secret_key
   R2_BUCKET_NAME=your_bucket_name
   R2_PUBLIC_DOMAIN=https://your-r2-domain.com
   VITE_R2_PUBLIC_DOMAIN=https://your-r2-domain.com
   
   # Cloud Storage (R2) - Optional, for file uploads
   R2_ACCOUNT_ID=your_r2_account_id
   R2_ACCESS_KEY_ID=your_r2_access_key
   R2_SECRET_ACCESS_KEY=your_r2_secret_key
   R2_BUCKET_NAME=your_bucket_name
   R2_PUBLIC_DOMAIN=https://your-r2-domain.com
   VITE_R2_PUBLIC_DOMAIN=https://your-r2-domain.com
   ```

4. 🗄️ **Database Setup**

   Create a MySQL database and update the `.env` file with your database credentials. The application will automatically sync models on startup.

5. 📱 **Mobile App Setup (Optional)**

   For building the mobile app:
   ```bash
   cd client
   npm install
   npx cap sync
   ```
   
   This will sync the web app with native Android/iOS projects.
   
   **Note**: The app includes `@capacitor/app` plugin for Android back button handling. Make sure to run `npx cap sync` after installing dependencies to sync the plugin with native projects.

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

Uploaded files (profile pictures, documents, event files) are stored in:
- **Cloud Storage (R2)**: Primary storage for production (configured via environment variables)
- **Local Storage**: `server/uploads/` - Fallback for development
- Files are served via CDN when R2 is configured, otherwise at `/uploads` endpoint
- Supported file types: Images (PNG, JPG, JPEG, GIF, SVG), Documents (PDF, DOCX, PPTX), Videos, and more

## 🔌 API Routes

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/activate` - Activate account
- `POST /api/auth/verify-activation-token` - Verify activation token
- `POST /api/auth/reset-password` - Reset password with token
- `POST /api/auth/forgot-password` - Request password reset email

### Applications
- `POST /api/applications` - Create application
- `GET /api/applications` - Get all applications (admin/board only)
- `PUT /api/applications/:id/status` - Update application status
- `PUT /api/applications/:id/comment` - Update application comment
- `DELETE /api/applications/:id` - Delete application

### Events
- `GET /api/events` - Get all events
- `GET /api/events/:id` - Get event by ID
- `POST /api/events` - Create event (admin/board/event-planning only)
- `PUT /api/events/:id` - Update event (admin/board/event-planning only)
- `DELETE /api/events/:id` - Delete event (admin/board/event-planning only)
- `POST /api/events/:id/register` - Register for event
- `POST /api/events/:id/files` - Upload file to event (admin/board/event-planning only)
- `GET /api/events/:id/files` - Get event files
- `DELETE /api/events/:id/files/:fileId` - Delete event file

### Attendance
- `POST /api/attendance/request` - Submit attendance request
- `GET /api/attendance/requests` - Get attendance requests (admin/board/event-planning only)
- `PUT /api/attendance/requests/:id` - Update attendance request status
- `GET /api/attendance/export` - Export attendance to CSV

### Members
- See `server/routes/members.js` for member routes

### Board
- See `server/routes/board.js` for board routes

### Users
- `GET /api/user/profile` - Get current user profile
- `PUT /api/user/profile` - Update user profile
- `POST /api/user/profile/picture` - Upload profile picture
- `POST /api/user/profile/schedule` - Upload schedule file

### File Uploads
- `POST /api/upload/:type` - Upload files (images, documents) - admin/board only
- Files are stored in cloud storage (R2) and served via CDN
- Supported types: images, documents, videos, assets, etc.

### Cloud Storage
- `GET /api/cloud/images` - Get all images
- `GET /api/cloud/slides` - Get slides
- `GET /api/cloud/videos` - Get videos
- `GET /api/cloud/documents` - Get documents
- `GET /api/cloud/assets` - Get assets
- `GET /api/cloud/assets/:type` - Get assets by type
- `GET /api/cloud/event-thumbnails` - Get event thumbnails

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

## 📱 Mobile App Features

### Android Back Button Handling

The app includes comprehensive Android back button handling:

- **Automatic Modal/Drawer Closing**: Closes navigation drawer and login modal first
- **Navigation History**: Navigates back through React Router history
- **App Exit**: Exits app when on home page
- **Priority-Based Handlers**: Components can register custom handlers with priorities
- **Capacitor Integration**: Uses `@capacitor/app` plugin for native Android support

**Setup**:
```bash
cd client
npm install  # Installs @capacitor/app
npx cap sync  # Syncs with native projects
```

### BackButton Component

All pages include a consistent `BackButton` component:
- **Fixed Position**: Top-left corner, overlaying content
- **Responsive**: Icon-only on mobile (≤480px), full button on larger screens
- **Consistent Styling**: Same appearance across all pages
- **Smart Navigation**: Navigates to appropriate page based on context

### Responsive Design

The app is fully responsive with breakpoints:
- **Desktop**: >1180px - Full navigation menu
- **Tablet**: 680px-1180px - Collapsible menu
- **Mobile**: 480px-680px - Mobile-optimized layouts
- **Small Mobile**: <480px - Compact layouts, icon-only buttons

## 📝 Notes

- The application uses Sequelize for database operations
- Database models are automatically synchronized on server start
- File uploads use Multer for handling multipart/form-data
- Email functionality requires SMTP configuration
- JWT tokens are used for stateless authentication
- Android back button handling requires `@capacitor/app` plugin
- BackButton component is fixed-positioned and appears on all pages except Home
- Mobile app excludes DownloadAndroidApp page (only available on web)

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
