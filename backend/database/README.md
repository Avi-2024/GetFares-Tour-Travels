# Get2Vacation CMS Project

> A comprehensive Content Management System for managing Get2Vacation website content, built on top of the existing CRM infrastructure.

---

## 📖 Overview

This project provides a CMS solution to dynamically manage content on the Get2Vacation website, including:
- Homepage floating cards
- Destinations and their details
- Package hierarchies
- Seasonal travel information
- Destination media galleries
- Visa service offerings

**Key Feature**: The CMS is designed to work seamlessly with the existing CRM system without breaking any functionality.

---

## 🎯 Project Goals

1. ✅ Enable dynamic content management for Get2Vacation website
2. ✅ Maintain full compatibility with existing CRM system
3. ✅ Provide intuitive admin interface for content editors
4. ✅ Optimize for performance and scalability
5. ✅ Ensure security and proper access control

---

## 📚 Documentation

### Start Here
- **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** - Executive overview and project status
- **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** - Quick lookups and common tasks

### Architecture & Design
- **[CMS_ARCHITECTURE.md](CMS_ARCHITECTURE.md)** - Complete system architecture
- **[ARCHITECTURE_DIAGRAMS.md](ARCHITECTURE_DIAGRAMS.md)** - Visual diagrams and data flows
- **[CRM_COMPATIBILITY.md](CRM_COMPATIBILITY.md)** - CRM integration guide

### Implementation
- **[IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md)** - Step-by-step development guide
- **[CMS_SCREENS.md](CMS_SCREENS.md)** - Detailed UI specifications

### Database
- **[cms-schema.sql](cms-schema.sql)** - CMS database schema
- **[migrations/001_add_crm_package_fields.sql](migrations/001_add_crm_package_fields.sql)** - CRM compatibility migration

---

## 🚀 Quick Start

### Prerequisites
- PostgreSQL 12+
- Node.js 16+
- Redis (optional, for caching)
- Existing CRM system running

### Installation

#### 1. Database Setup
```bash
# Backup existing database
pg_dump -U your_user -d your_database > backup_$(date +%Y%m%d).sql

# Run CRM compatibility migration
psql -U your_user -d your_database -f migrations/001_add_crm_package_fields.sql

# Deploy CMS schema
psql -U your_user -d your_database -f cms-schema.sql

# Verify tables created
psql -U your_user -d your_database -c "\dt" | grep -E "(landing_places|destinations|main_packages)"
```

#### 2. Backend Setup
```bash
cd backend
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Start development server
npm run dev
```

#### 3. CMS Frontend Setup
```bash
cd cms-frontend
npm install

# Configure environment
cp .env.example .env
# Edit .env with API URL

# Start development server
npm run dev
```

#### 4. Update Get2Vacation Website
```bash
cd get2vacation/frontendin
npm install

# Update API endpoints to use new public API
# See IMPLEMENTATION_GUIDE.md for details

npm run dev
```

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND LAYER                        │
├──────────────┬──────────────┬───────────────────────────┤
│ CRM Frontend │ CMS Frontend │ Get2Vacation Website      │
│ (Existing)   │    (New)     │     (Existing)            │
└──────┬───────┴──────┬───────┴──────┬────────────────────┘
       │              │              │
       │ JWT Auth     │ JWT Auth     │ Public (No Auth)
       │              │              │
┌──────▼──────────────▼──────────────▼────────────────────┐
│                    BACKEND API                           │
├──────────────┬──────────────┬───────────────────────────┤
│  /api/crm/*  │  /api/cms/*  │    /api/public/*          │
│  (Existing)  │    (New)     │       (New)               │
└──────┬───────┴──────┬───────┴──────┬────────────────────┘
       │              │              │
┌──────▼──────────────▼──────────────▼────────────────────┐
│              DATABASE (PostgreSQL)                       │
├──────────────────────────────────────────────────────────┤
│  CRM Tables  │  Shared Tables  │  CMS Tables            │
│  (Existing)  │  (Enhanced)     │  (New)                 │
└──────────────────────────────────────────────────────────┘
```

**Key Design Principle**: The CMS builds on top of the CRM without modifying core functionality.

---

## 📊 Database Schema

### CMS Tables (New)
- `landing_places` - Homepage floating cards
- `destination_media` - Destination images/videos
- `season_cards` - Best time to visit information
- `main_packages` - Package hierarchy layer
- `destination_package_map` - Destination-package relationships
- `sub_packages` - Package variants
- `visa_destinations` - Visa service offerings
- `visa_destination_details` - Visa requirements and facts
- `featured_picks` - Featured/hot picks
- `cms_activity_log` - Audit trail

### Shared Tables (Enhanced)
- `packages` - Used by both CRM and CMS
- `destinations` - Enhanced with CMS fields

### CRM Tables (Unchanged)
All existing CRM tables remain unchanged and fully functional.

---

## 🔌 API Endpoints

### CMS API (Admin - Requires Authentication)
```
/api/cms/landing-places      - Manage homepage cards
/api/cms/destinations         - Manage destinations
/api/cms/destinations/:id/media - Manage media
/api/cms/destinations/:id/seasons - Manage season cards
/api/cms/packages             - Manage package hierarchy
/api/cms/visa-destinations    - Manage visa services
```

### Public API (Website - No Authentication)
```
/api/public/landing/places    - Get homepage cards
/api/public/destinations      - List destinations
/api/public/destinations/:slug - Get destination details
/api/public/packages/:id      - Get package details
/api/public/visa/destinations - List visa services
```

---

## 🎨 CMS Features

### Content Management
- ✅ Landing page floating cards (max 4)
- ✅ Destination management with media galleries
- ✅ Package hierarchy (main + sub packages)
- ✅ Seasonal travel information
- ✅ Visa service offerings
- ✅ Featured/hot picks

### User Interface
- ✅ Intuitive dashboard
- ✅ Drag-and-drop reordering
- ✅ Image upload with preview
- ✅ Live website preview
- ✅ Search and filtering
- ✅ Bulk operations

### Technical Features
- ✅ Role-based access control
- ✅ Activity logging
- ✅ API caching
- ✅ Image optimization
- ✅ SEO optimization

---

## 🔐 Security

### Authentication
- JWT-based authentication for CMS API
- Role-based access control (RBAC)
- Secure password hashing

### Authorization
- CRM users: Access to CRM functionality
- CMS users: Access to CMS functionality
- Public: Read-only access to published content

### Data Protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF protection
- Rate limiting on public API

---

## 🧪 Testing

### Run Tests
```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage
npm run test:coverage
```

### Test CRM Compatibility
```bash
# Verify CRM still works after migration
npm test -- crm/packages
npm test -- crm/quotations
```

---

## 📦 Deployment

### Production Deployment

#### 1. Database Migration
```bash
# On production database
psql -U prod_user -d prod_db -f migrations/001_add_crm_package_fields.sql
psql -U prod_user -d prod_db -f cms-schema.sql
```

#### 2. Backend Deployment
```bash
npm run build
pm2 start ecosystem.config.js
```

#### 3. Frontend Deployment
```bash
# CMS Frontend
cd cms-frontend
npm run build
# Deploy to hosting (Vercel/Netlify)

# Get2Vacation Website
cd get2vacation/frontendin
npm run build
# Deploy to Vercel
```

---

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/db
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
AWS_S3_BUCKET=your-bucket
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
NODE_ENV=production
PORT=3000
```

#### CMS Frontend (.env)
```bash
REACT_APP_API_URL=https://api.example.com
REACT_APP_CDN_URL=https://cdn.example.com
```

#### Get2Vacation Website (.env)
```bash
REACT_APP_API_URL=https://api.example.com
REACT_APP_CDN_URL=https://cdn.example.com
```

---

## 📈 Performance

### Optimization Strategies
- Database indexes on frequently queried columns
- Redis caching for public API responses
- CDN for media files
- Image optimization and lazy loading
- API response pagination
- Connection pooling

### Monitoring
- API response times
- Database query performance
- Cache hit rates
- Error rates
- User activity

---

## 🐛 Troubleshooting

### Common Issues

**Issue**: CRM packages not showing in CMS
- **Solution**: Ensure `publish_to_website = true` on packages

**Issue**: Website not updating after CMS changes
- **Solution**: Clear cache or reduce cache TTL

**Issue**: Images not loading
- **Solution**: Check CORS settings and CDN configuration

**Issue**: Slow API responses
- **Solution**: Check database indexes, enable caching

See [QUICK_REFERENCE.md](QUICK_REFERENCE.md) for more troubleshooting tips.

---

## 📝 Development Workflow

### Adding New Content Type

1. **Database**: Add table to `cms-schema.sql`
2. **Backend**: Create module (controller, service, repository, routes)
3. **Frontend**: Create management screen
4. **Public API**: Add endpoint for website
5. **Website**: Integrate API endpoint
6. **Test**: Write tests for all layers
7. **Document**: Update relevant documentation

### Making Changes

1. Create feature branch
2. Make changes
3. Write/update tests
4. Update documentation
5. Submit pull request
6. Code review
7. Merge to main
8. Deploy

---

## 🤝 Contributing

### Code Style
- Follow existing code patterns
- Use ESLint and Prettier
- Write meaningful commit messages
- Add comments for complex logic

### Pull Request Process
1. Update documentation
2. Add tests for new features
3. Ensure all tests pass
4. Update CHANGELOG.md
5. Request code review

---

## 📞 Support

### Documentation
- Start with [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)
- Check [QUICK_REFERENCE.md](QUICK_REFERENCE.md) for common tasks
- Review [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md) for detailed steps

### Issues
- Check existing documentation first
- Search for similar issues
- Create detailed bug reports
- Include steps to reproduce

---

## 📅 Roadmap

### Phase 1: Core CMS (Current)
- ✅ Database schema
- ✅ Architecture documentation
- ⏳ Backend API implementation
- ⏳ CMS frontend development
- ⏳ Website integration

### Phase 2: Enhancements
- Multi-language support
- Content versioning
- Scheduled publishing
- Advanced analytics
- SEO tools

### Phase 3: Advanced Features
- A/B testing
- Personalization
- Email campaigns
- Workflow approvals
- Advanced reporting

---

## 📄 License

[Your License Here]

---

## 👥 Team

- **Architecture**: [Your Name]
- **Backend**: [Team Members]
- **Frontend**: [Team Members]
- **DevOps**: [Team Members]

---

## 🙏 Acknowledgments

- CRM team for existing infrastructure
- Get2Vacation team for requirements
- All contributors

---

## 📊 Project Status

**Current Phase**: Planning Complete ✅  
**Next Phase**: Implementation  
**Estimated Timeline**: 5-7 weeks  
**Risk Level**: Low  

---

**Last Updated**: 2024  
**Version**: 1.0.0  
**Status**: Ready for Implementation 🚀
