# Technology Stack

## Programming Languages

### Backend
- **Node.js** (>= 20.0.0) - JavaScript runtime
- **ES Modules** - Modern JavaScript module system (type: "module")

### Frontend
- **TypeScript** (~5.9.3) - Typed JavaScript superset
- **JavaScript (ES6+)** - Modern JavaScript features

## Backend Technology Stack

### Core Framework
- **Express.js** (^4.21.2) - Web application framework
- **Node.js** (>= 20.0.0) - Runtime environment

### Database
- **PostgreSQL** - Primary relational database
- **pg** (^8.13.3) - PostgreSQL client for Node.js
- **pgcrypto** extension - UUID generation (gen_random_uuid())

### Authentication & Security
- **jsonwebtoken** (^9.0.2) - JWT token generation and verification
- **bcrypt** (^6.0.0) / **bcryptjs** (^2.4.3) - Password hashing
- **helmet** (^8.1.0) - Security headers middleware
- **cors** (^2.8.5) - Cross-Origin Resource Sharing

### Validation
- **zod** (^3.24.2) - Schema validation and type inference

### Logging & Observability
- **pino** (^9.8.0) - High-performance JSON logger
- **pino-http** (^10.5.0) - HTTP request logging middleware

### Real-time Communication
- **socket.io** (^4.8.3) - WebSocket library for real-time updates

### File Handling
- **multer** (^1.4.5-lts.1) - Multipart/form-data file upload
- **@aws-sdk/client-s3** (^3.758.0) - AWS S3 file storage

### Email & Communication
- **nodemailer** (^6.10.1) - Email sending
- **WhatsApp Cloud API** - WhatsApp integration (custom implementation)

### PDF Generation
- **pdfkit** (^0.17.1) - PDF document generation for quotations and invoices

### Configuration
- **dotenv** (^16.5.0) - Environment variable management

### Development Tools
- **nodemon** (^3.1.10) - Auto-restart on file changes
- **eslint** (^9.22.0) - Code linting

## Frontend Technology Stack

### Core Framework
- **React** (^19.2.0) - UI library
- **React DOM** (^19.2.0) - React rendering
- **React Router DOM** (^7.13.1) - Client-side routing

### HTTP Client
- **axios** (^1.13.6) - Promise-based HTTP client

### UI & Styling
- **Tailwind CSS** (^3.4.19) - Utility-first CSS framework
- **PostCSS** (^8.5.8) - CSS transformation
- **Autoprefixer** (^10.4.27) - CSS vendor prefixing

### Data Visualization
- **recharts** (^3.7.0) - Chart library for analytics dashboards

### Icons
- **react-icons** (^5.6.0) - Icon library

### Utilities
- **country-state-city** (^3.2.1) - Country, state, city data

### Build Tools
- **Vite** (^7.3.1) - Fast build tool and dev server
- **@vitejs/plugin-react** (^5.1.1) - React plugin for Vite

### TypeScript Support
- **TypeScript** (~5.9.3) - Type checking
- **@types/react** (^19.2.7) - React type definitions
- **@types/react-dom** (^19.2.3) - React DOM type definitions
- **@types/node** (^24.10.1) - Node.js type definitions

### Code Quality
- **ESLint** (^9.39.1) - JavaScript/TypeScript linting
- **@eslint/js** (^9.39.1) - ESLint JavaScript rules
- **typescript-eslint** (^8.48.0) - TypeScript ESLint rules
- **eslint-plugin-react-hooks** (^7.0.1) - React Hooks linting
- **eslint-plugin-react-refresh** (^0.4.24) - React Refresh linting
- **globals** (^16.5.0) - Global variables for ESLint

## External Integrations

### Cloud Services
- **AWS S3** - File storage for documents, quotations, images
- **Vercel** - Deployment platform (frontend and backend)

### Third-Party APIs
- **Meta Lead Ads API** - Facebook/Instagram lead capture
- **WhatsApp Cloud API** - WhatsApp messaging automation
- **Google Ads** - Lead capture integration (planned)

### Email Services
- **SMTP / SendGrid** - Email delivery (configurable)

## Development Commands

### Backend Commands
```bash
# Development
npm run dev                 # Start with nodemon (auto-reload)
npm start                   # Start production server

# Database
npm run db:migrate          # Run database migrations
npm run db:seed:rbac        # Seed RBAC data
npm run db:backup           # Backup database
npm run db:restore          # Restore database

# Code Quality
npm run lint                # Run ESLint

# Testing
npm run test:sprint1        # Run Sprint 1 tests
npm run test:sprint2        # Run Sprint 2 tests
npm run test:sprint3        # Run Sprint 3 tests
npm run test:sprint4        # Run Sprint 4 tests
npm run test:sprint5        # Run Sprint 5 tests
npm run test:sprint6        # Run Sprint 6 tests
npm run test:sprint7        # Run Sprint 7 tests
npm run test:sprint8        # Run Sprint 8 tests
```

### Frontend Commands
```bash
# Development
npm run dev                 # Start Vite dev server

# Build
npm run build               # Build for production (custom script)

# Code Quality
npm run lint                # Run ESLint

# Preview
npm run preview             # Preview production build
```

## Environment Configuration

### Backend Environment Variables (.env)
- **DATABASE_URL** - PostgreSQL connection string
- **JWT_SECRET** - JWT signing secret
- **JWT_EXPIRES_IN** - JWT expiration time
- **PORT** - Server port (default: 3000)
- **NODE_ENV** - Environment (development/production)
- **AWS_ACCESS_KEY_ID** - AWS S3 access key
- **AWS_SECRET_ACCESS_KEY** - AWS S3 secret key
- **AWS_REGION** - AWS region
- **AWS_S3_BUCKET** - S3 bucket name
- **SMTP_HOST** - Email SMTP host
- **SMTP_PORT** - Email SMTP port
- **SMTP_USER** - Email SMTP username
- **SMTP_PASS** - Email SMTP password
- **WHATSAPP_API_TOKEN** - WhatsApp Cloud API token
- **WHATSAPP_PHONE_NUMBER_ID** - WhatsApp phone number ID
- **META_VERIFY_TOKEN** - Meta webhook verification token
- **META_APP_SECRET** - Meta app secret

### Frontend Environment Variables (.env)
- **VITE_API_BASE_URL** - Backend API base URL
- **VITE_SOCKET_URL** - Socket.io server URL

## Database Schema
- **PostgreSQL** with pgcrypto extension
- **Migrations** - SQL-based migrations in `database/migrations/`
- **Schema** - Complete schema in `database/main-db.sql`
- **Seed Data** - RBAC seed in `database/seed-rbac.json`

## API Architecture
- **RESTful API** - Standard REST endpoints
- **JSON** - Request/response format
- **JWT Authentication** - Bearer token authentication
- **Role-Based Access Control** - Permission-based authorization

## Real-time Architecture
- **Socket.io** - WebSocket connections
- **Room-based Broadcasting** - User-specific notifications
- **Event-driven** - Pub/sub pattern for real-time updates

## Deployment
- **Vercel** - Serverless deployment for both frontend and backend
- **vercel.json** - Deployment configuration in both frontend and backend

## Health & Monitoring
- **Health Endpoints**:
  - GET /health - Overall health check
  - GET /health/live - Liveness probe
  - GET /health/ready - Readiness probe
- **Metrics Endpoints**:
  - GET /metrics - Prometheus-style metrics
  - GET /metrics/json - JSON metrics

## Code Quality Standards
- **ESLint** - Enforced linting rules
- **ES Modules** - Modern module system
- **Async/Await** - Promise-based async handling
- **Error Handling** - Centralized error middleware
- **Validation** - Zod schema validation on all inputs
