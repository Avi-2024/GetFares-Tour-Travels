# Project Structure

## Architecture Overview
**Modular Monolith** with feature-based architecture, clean layering (Controller → Service → Repository), and module factories with dependency injection for portability.

## Root Directory Structure

```
travel-crm/
├── backend/              # Node.js + Express modular monolith
├── frontend/             # React + TypeScript SPA
├── docs/                 # Project documentation and specifications
├── .amazonq/             # Amazon Q rules and memory bank
├── .zencoder/            # Zencoder workflows
└── .zenflow/             # Zenflow workflows
```

## Backend Structure (`backend/`)

### Core Layers (`src/core/`)
Cross-cutting concerns shared across all modules:

- **automation/** - Scheduler for automated tasks (follow-ups, reminders)
- **config/** - Environment configuration and settings (env.js)
- **constants/** - System-wide constants (roles, statuses)
- **database/** - PostgreSQL connection and query utilities
- **errors/** - Custom error classes (AppError)
- **logger/** - Pino-based structured logging
- **mail/** - Email service using Nodemailer
- **middlewares/** - Express middlewares (auth, validation, error handling, request context)
- **observability/** - Metrics collection and health checks
- **realtime/** - Socket.io server for real-time notifications
- **roles/** - RBAC role management service
- **storage/** - AWS S3 file storage service
- **uploads/** - File upload handling with Multer
- **utils/** - Shared utilities (asyncHandler, pagination)

### Feature Modules (`src/modules/`)
Each module follows the same factory pattern with complete encapsulation:

**Module Structure Pattern:**
```
<module>/
├── <module>.controller.js    # HTTP request handlers
├── <module>.service.js       # Business logic
├── <module>.repository.js    # Database queries
├── <module>.routes.js        # Express routes
├── <module>.validation.js    # Zod validation schemas
├── <module>.schema.js        # Database schema definitions
├── <module>.events.js        # Event emitters/listeners
├── <module>.middleware.js    # Module-specific middleware (optional)
└── index.js                  # Module factory export
```

**Available Modules:**
- **auth/** - Authentication (login, password reset, JWT tokens)
- **rbac/** - Role-Based Access Control (roles, permissions, resource access)
- **users/** - User management (CRUD, hierarchy, manager assignment)
- **leads/** - Lead management (capture, assignment, status tracking)
- **quotations/** - Quotation creation, templates, PDF generation
- **bookings/** - Booking workflow, supplier coordination
- **payments/** - Payment tracking, invoices, refunds
- **refunds/** - Refund request and processing
- **visa/** - Visa case management, document tracking
- **customers/** - Customer profiles, history, segmentation
- **campaigns/** - Marketing campaigns and tracking
- **complaints/** - Customer complaints and resolution
- **packages/** - Travel package management and website publishing
- **destinations/** - Destination management and pricing
- **suppliers/** - Supplier directory and coordination
- **countries/** - Country management and assignment
- **employees/** - Employee directory, attendance, targets
- **dashboard/** - Analytics and KPI dashboards
- **reports/** - Reporting and data export
- **notifications/** - In-app notification system
- **settings/** - System configuration and preferences
- **mail/** - Email sending and templates
- **whatsapp/** - WhatsApp Cloud API integration
- **metaWebhook/** - Facebook/Instagram Lead Ads webhook
- **webhooks/** - Generic webhook handlers

### Database (`database/`)
- **migrations/** - SQL migration files (001_initial_schema.sql)
- **main-db.sql** - Complete database schema
- **seed-rbac.json** - RBAC seed data (roles, permissions)
- **seed-dummy-data.sql** - Test data for development

### Scripts (`scripts/`)
Operational and testing scripts:
- **migrate.js** - Run database migrations
- **seed-rbac.js** - Seed RBAC data
- **seed-dummy-data.js** - Seed test data
- **backup-db.js** / **restore-db.js** - Database backup/restore
- **test-sprint[1-8].js** - Sprint-specific test suites

### API Entry Points (`api/`)
- **index.js** - Main API router aggregating all module routes

## Frontend Structure (`frontend/`)

### Source Organization (`src/`)

**API Layer (`api/`)** - Axios-based HTTP clients for each backend module:
- apiClient.ts (base configuration)
- Individual API modules: auth.ts, leads.ts, quotations.ts, bookings.ts, etc.

**Components (`components/`)**
- **form/** - Reusable form inputs (TextInput, DateInput, CurrencyInput, NumberInput, MultiTagInput, UUIDSelect)
- **layout/** - Layout components (Header, Sidebar, Layout, NotificationDrawer)
- **quotations/** - Quotation-specific components (EditQuotationModal)
- **settings/** - Settings panels (CountryManagementPanel, DestinationPricingManager)
- **ui/** - Shared UI components (StatusBadge, Timeline, EmptyState, FilterTabs, PermissionGate, SearchableDropdown, TableFilterPanel)

**Context (`context/`)** - React Context providers:
- AuthContext.tsx - Authentication state
- NotificationsContext.tsx - Real-time notifications
- ServiceContext.tsx - Service layer dependency injection

**Data Sources (`datasource/`)** - Data fetching and caching layer:
- Individual datasources: authDatasource.ts, leadsDatasource.ts, bookingsDatasource.ts, etc.

**Hooks (`hooks/`)** - Custom React hooks:
- Service hooks: useAuthService.ts, useLeadsService.ts, useBookingsService.ts, etc.
- useServices.ts - Service layer access

**Pages (`pages/`)** - Route components organized by feature:
- **auth/** - Login, ForgotPassword, ResetPassword
- **core/** - Dashboard
- **leads/** - Leads, CreateLead, LeadDetails
- **Quotation/** - QuotationsPage, CreateQuotationPage, EditQuotationPage, QuotationDetailPage, QuotationBuilderPage, QuotationTemplatesPage
- **Booking/** - BookingsPage, BookingDetailPage
- **customers/** - CustomersPage, CustomerDetailPage, NewCustomerPage
- **visa/** - VisaCasesPage, VisaCreatePage, VisaDetailPage
- **campaigns/** - CampaignsPage
- **complaints/** - ComplaintsPage, ComplaintDetailPage
- **packages/** - PackagesPage
- **destinations/** - DestinationsPage
- **suppliers/** - SuppliersPage
- **users/** - UsersPage
- **reports/** - ReportsHubPage
- **refunds/** - RefundsPage
- **notifications/** - NotificationsPage
- **profile/** - ProfilePage
- **Finance/** - FinanceSystem
- **public/** - PublicLeadCapturePage

**Services (`services/`)** - Business logic layer:
- Individual services: authService.ts, leadsService.ts, bookingsService.ts, etc.

**Types (`types/`)** - TypeScript type definitions:
- types.ts - Shared types
- remote-modules.d.ts - Remote module declarations

**Utils (`utils/`)** - Utility functions:
- bookingFromQuotation.ts - Booking conversion logic
- countries.ts - Country utilities
- leadStatus.ts - Lead status helpers
- workflowValidation.ts - Workflow validation

### Build Configuration
- **vite.config.ts** - Vite build configuration
- **tailwind.config.js** - Tailwind CSS configuration
- **postcss.config.js** - PostCSS configuration
- **tsconfig.json** - TypeScript configuration
- **eslint.config.js** - ESLint configuration

## Documentation (`docs/`)
- **PRD - CRM.pdf** / **PRD_-_CRM.txt** - Product Requirements Document
- **HOLIDAYS SOP.pdf** / **HOLIDAYS_SOP.txt** - Standard Operating Procedures
- **Finance-system.txt** - Finance system integration requirements
- **leadsFlow.txt** - Lead workflow documentation
- **features/** - Feature-specific documentation

## Architectural Patterns

### Module Portability Contract
Every backend module exports a factory function:
```javascript
function createXModule({ dependencies }) {
  // wires repository, service, controller, routes
  return {
    name,
    router,
    controller,
    service,
    repository,
    events,
  };
}
```

### Dependency Injection
- Backend: Container-based DI in `container.js`
- Frontend: Context-based DI via ServiceContext

### Event-Driven Architecture
- Event bus for inter-module communication
- Event subscribers for automated workflows (mail, notifications, WhatsApp)

### Layered Architecture
1. **Routes** - HTTP endpoint definitions
2. **Controllers** - Request/response handling
3. **Services** - Business logic and orchestration
4. **Repositories** - Data access and persistence
5. **Events** - Asynchronous event handling

### Real-time Communication
- Socket.io for real-time notifications
- Room-based broadcasting for user-specific updates
- Event publisher for cross-module real-time updates
