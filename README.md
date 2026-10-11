# Telehealth & Real-Time Consultation Engine

This is a new, clean educational implementation. It is **not** the original source code of any resume project.

## Current status: Complete educational implementation (Phases 0–18)

The project now has a fully working telehealth consultation system:

- **React frontend** with login, registration, role-based dashboards, real-time chat, presence indicators, typing indicators, and guest access
- **Express backend** with REST APIs, Socket.io real-time messaging, JWT authentication, bcrypt password hashing, and role-based access control
- **MongoDB** persistence for users, consultations, messages, and guest profiles
- **Socket.io** for real-time bidirectional messaging, presence tracking, and typing indicators
- **JWT** authentication with separate token lifetimes for normal users and guests
- **RBAC** with Patient, Doctor, and Admin roles
- **Guest access** with short-lived tokens for emergency consultations
- **Background cleanup worker** for expired guest profiles and stale data
- **Redis** configuration with graceful fallback (optional)
- **Security hardening** with Helmet, rate limiting, CORS, input validation, and body size limits
- **Docker** containerization with docker-compose for local development
- **Comprehensive tests** covering authentication, RBAC, consultations, guest access, cleanup, failure handling, and Socket.io

## Architecture

```text
React Frontend (Vite)
  ↓ HTTP (fetch) + Socket.io (WebSocket)
Node.js + Express
  ↓ Mongoose ODM
MongoDB
  ↓ (optional)
Redis (rate limiting, presence — graceful fallback)
  ↓
Background Cleanup Worker (setInterval)
```

## Project structure

```text
telehealth/
├── client/                          # React browser application
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatWindow.jsx       # Real-time chat with typing + presence
│   │   │   ├── Navbar.jsx           # Navigation with auth state
│   │   │   └── ProtectedRoute.jsx   # Client-side route guard
│   │   ├── context/
│   │   │   └── AuthContext.jsx      # Global auth state + socket connection
│   │   ├── pages/
│   │   │   ├── AdminDashboard.jsx   # System overview for admins
│   │   │   ├── DoctorDashboard.jsx  # Consultation management + chat
│   │   │   ├── GuestAccessPage.jsx  # Emergency temporary access
│   │   │   ├── LoginPage.jsx        # User login form
│   │   │   ├── PatientDashboard.jsx # Consultation requests + chat
│   │   │   └── RegisterPage.jsx     # User registration form
│   │   ├── services/
│   │   │   ├── api.js               # HTTP client with JWT headers
│   │   │   └── socket.js            # Socket.io client management
│   │   ├── styles/
│   │   │   └── index.css            # Global styles including chat UI
│   │   ├── App.jsx                  # Root router component
│   │   └── main.jsx                 # React entry point
│   ├── Dockerfile                   # Multi-stage build with Nginx
│   ├── nginx.conf                   # SPA routing configuration
│   ├── vite.config.js               # Vite build configuration
│   ├── index.html                   # Browser HTML shell
│   └── package.json
├── server/                          # Node.js / Express application
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js          # MongoDB connection
│   │   │   ├── env.js               # Environment variables
│   │   │   └── redis.js             # Redis connection with fallback
│   │   ├── controllers/
│   │   │   ├── authController.js    # Registration + login
│   │   │   ├── consultationController.js # Consultation lifecycle
│   │   │   ├── guestController.js   # Guest access
│   │   │   └── userController.js    # User listing
│   │   ├── middleware/
│   │   │   ├── authenticate.js      # JWT verification
│   │   │   ├── authorize.js         # RBAC role checking
│   │   │   ├── errorHandler.js      # Global error handler
│   │   │   ├── notFound.js          # 404 handler
│   │   │   └── rateLimiter.js       # Rate limiting
│   │   ├── models/
│   │   │   ├── Consultation.js      # Consultation lifecycle model
│   │   │   ├── GuestProfile.js      # Temporary guest profile
│   │   │   ├── Message.js           # Chat message model
│   │   │   └── User.js              # User model with passwordHash
│   │   ├── routes/
│   │   │   ├── authRoutes.js        # POST /register, /login
│   │   │   ├── consultationRoutes.js # CRUD + status transitions
│   │   │   ├── demoRoutes.js        # Phase 1 teaching endpoints
│   │   │   ├── guestRoutes.js       # POST /access
│   │   │   ├── healthRoutes.js      # GET /health
│   │   │   ├── protectedRoutes.js   # /me + role dashboards
│   │   │   └── userRoutes.js        # GET /users
│   │   ├── services/
│   │   │   ├── passwordService.js   # bcrypt hash + verify
│   │   │   └── tokenService.js      # JWT generate + verify
│   │   ├── sockets/
│   │   │   ├── messageHandler.js    # Real-time messaging
│   │   │   ├── presenceHandler.js   # Online/offline + typing
│   │   │   └── socketHandler.js     # Socket.io setup + auth
│   │   ├── workers/
│   │   │   └── cleanupWorker.js     # Background data cleanup
│   │   ├── app.js                   # Express app setup
│   │   └── server.js                # HTTP + Socket.io server
│   ├── scripts/
│   │   └── seedAdmin.js             # Create admin account
│   ├── test/
│   │   ├── auth-registration.test.js
│   │   ├── auth-login.test.js
│   │   ├── rbac.test.js
│   │   ├── consultation.test.js
│   │   ├── guest.test.js
│   │   ├── cleanup.test.js
│   │   ├── failure-handling.test.js
│   │   └── socket.test.js
│   ├── Dockerfile                   # Node.js production image
│   └── package.json
├── docker-compose.yml               # Full-stack local environment
├── .env.example                     # Environment variable template
├── .gitignore
├── package.json                     # NPM workspaces root
└── README.md
```

## Development phases

1. **Phase 0:** Workspace, documentation, health check, and safe configuration.
2. **Phase 1:** Node.js/Express API structure, environment configuration, JSON routes.
3. **Phase 2:** MongoDB connection, User and Consultation models, validation.
4. **Phase 3:** bcrypt password hashing and secure Patient/Doctor registration.
5. **Phase 4:** Login with JWT and protected routes.
6. **Phase 5:** Role-based access control (RBAC) with Admin, Doctor, Patient.
7. **Phase 6:** React frontend — login, registration, role-based dashboards.
8. **Phase 7:** Consultation lifecycle — request, accept, active, complete, cancel.
9. **Phase 8:** Socket.io foundation — connection, authentication, test events.
10. **Phase 9:** Real-time messaging — persist-first, rooms, message history.
11. **Phase 10:** Presence tracking and typing indicators.
12. **Phase 11:** Guest access with short-lived JWT tokens.
13. **Phase 12:** Background cleanup worker for expired data.
14. **Phase 13:** Redis configuration with graceful fallback.
15. **Phase 14:** Security hardening — Helmet, rate limiting, body limits.
16. **Phase 15:** Failure handling tests — expired tokens, invalid input, unauthorized access.
17. **Phase 16:** Comprehensive testing — Socket.io, failure scenarios.
18. **Phase 17:** Docker containerization with docker-compose.
19. **Phase 18:** Architecture review and documentation.

## Run locally

You need Node.js 20 or newer.

1. Copy `.env.example` to `.env`. For local MongoDB, the supplied `MONGODB_URI` works when MongoDB is running on your computer.

2. Install dependencies from the project root:

   ```bash
   npm install
   ```

3. Start local MongoDB (in a separate terminal):

   ```bash
   mkdir -p data/mongodb
   mongod --dbpath data/mongodb
   ```

4. Run the backend:

   ```bash
   npm run dev:server
   ```

5. Run the frontend (in another terminal):

   ```bash
   npm run dev:client
   ```

6. Open `http://localhost:5173` in your browser.

### Create an admin account

```bash
npm run seed:admin --workspace=server
```

This creates `admin@telehealth.test` with password `admin-password-123`.

### Run tests

```bash
TEST_MONGODB_URI=mongodb://127.0.0.1:27017/telehealth_test npm run test:server
```

### Run with Docker

```bash
docker compose up --build
```

This starts MongoDB, Redis, the backend, and the frontend.

## API routes

### Authentication

| Request | Purpose |
| --- | --- |
| `POST /api/auth/register` | Create a Patient or Doctor account |
| `POST /api/auth/login` | Login and receive a JWT token |

### Protected routes

| Request | Purpose | Access |
| --- | --- | --- |
| `GET /api/protected/me` | Get current user info | Any authenticated user |
| `GET /api/protected/patient/dashboard` | Patient dashboard data | Patient, Admin |
| `GET /api/protected/doctor/dashboard` | Doctor dashboard data | Doctor, Admin |
| `GET /api/protected/admin/dashboard` | Admin dashboard data | Admin only |

### Consultations

| Request | Purpose | Access |
| --- | --- | --- |
| `POST /api/consultations` | Request a consultation | Patient, Guest |
| `GET /api/consultations/my` | View own consultations | Any authenticated user |
| `GET /api/consultations` | View all consultations | Admin only |
| `GET /api/consultations/:id` | View single consultation | Participant or Admin |
| `PATCH /api/consultations/:id/status` | Update consultation status | Doctor, Admin, Patient (cancel only) |

### Guest access

| Request | Purpose |
| --- | --- |
| `POST /api/guest/access` | Get temporary guest access (15-minute JWT) |

### Users

| Request | Purpose | Access |
| --- | --- | --- |
| `GET /api/users` | List users (supports `?role=doctor`) | Any authenticated user |

### Health

| Request | Purpose |
| --- | --- |
| `GET /api/health` | API health check |

## Socket.io events

| Event | Direction | Purpose |
| --- | --- | --- |
| `joinConsultation` | Client → Server | Join a consultation room |
| `leaveConsultation` | Client → Server | Leave a consultation room |
| `sendMessage` | Client → Server | Send a message (persist-first) |
| `newMessage` | Server → Client | New message notification |
| `typing` | Client → Server | Started typing |
| `stopTyping` | Client → Server | Stopped typing |
| `userTyping` | Server → Client | Another user is typing |
| `userStoppedTyping` | Server → Client | Another user stopped typing |
| `userOnline` | Server → Client | A user came online |
| `userOffline` | Server → Client | A user went offline |
| `getOnlineUsers` | Client → Server | Get list of online users |
| `ping` | Client → Server | Test event |

## Security measures

- **Passwords** are hashed with bcrypt (12 salt rounds) — never stored as plain text
- **JWT** tokens are signed with a server-side secret from environment variables
- **Admin self-registration** is blocked — admins must be created via seed script
- **Rate limiting** prevents brute-force attacks (20 auth attempts / 15 minutes)
- **Helmet** sets secure HTTP headers
- **CORS** restricts which frontend can access the API
- **Body size limiting** prevents oversized payloads (1MB max)
- **Input validation** on all user-submitted data
- **Socket authentication** requires valid JWT for WebSocket connections
- **Authorization checks** on every consultation and message operation
