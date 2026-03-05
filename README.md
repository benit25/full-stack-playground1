# PLXYGROUND - Full Stack Sports Creator Platform

A comprehensive platform connecting creators and brands in the sports industry.

## 📁 Project Structure

```
├── backend/          # Node/Express API (port 3011)
├── frontend/         # Expo React Native Web (port 19006)
├── admin-panel/      # React Admin Dashboard (port 3012)
├── docs/             # Documentation
└── .env.example      # Environment variables template
```

## 🚀 Setup & Installation

### Prerequisites
- Node.js >= 18.0.0
- npm or yarn

### 1. Environment Setup

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Update values as needed:
- `JWT_SECRET`: Choose a strong secret key
- `DB_PROVIDER`: `sqlite` or `postgres`
- Database URLs
- API origins for CORS

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Seed database (creates admin, creators, and sample content)
npm run seed

# Start server (runs on port 3011)
npm start
```

**Demo Credentials (from seed):**
- Admin: `admin@plxyground.local` / `Internet2026@`
- Creator: `sarahjohnson@plxyground.local` / `Password1!`
- Business: `nike@plxyground.local` / `Password1!`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start Expo web dev server (runs on port 19006)
npm run web
```

### 4. Admin Panel Setup

```bash
cd admin-panel

# Install dependencies
npm install

# Start development server (runs on port 3012)
npm start
```

## 📊 API Endpoints

### Authentication
- `POST /api/auth/signup` - Creator signup
- `POST /api/auth/login` - Creator login
- `POST /api/admin/auth/login` - Admin login

### Content
- `GET /api/content` - Public feed
- `GET /api/content/:id` - Content detail
- `POST /api/content` - Create content (auth required, media_url required)
- `PUT /api/content/:id` - Update content (owner or admin)
- `DELETE /api/content/:id` - Delete content (owner or admin)

### Creators
- `GET /api/creators` - List creators
- `GET /api/creators/:id` - Creator detail
- `GET /api/creators/slug/:slug` - Creator by slug

### Opportunities
- `GET /api/opportunities` - Public opportunities list

### Admin Routes (require ADMIN role)
- `GET /api/admin/queue` - Moderation queue
- `POST /api/admin/queue/bulk-action` - Bulk approve/reject/delete
- `GET /api/admin/content` - All content (limited to 2000)
- `PUT /api/admin/content/:id` - Update content
- `DELETE /api/admin/content/:id` - Delete content
- `GET /api/admin/users` - User management
- `POST /api/admin/users/:userId/suspend` - Suspend user
- `POST /api/admin/users/:userId/reactivate` - Reactivate user
- `POST /api/admin/users/:userId/verify` - Verify user
- `POST /api/admin/users/:userId/reset-password` - Reset password
- `GET /api/admin/audit` - Audit log
- `GET /api/admin/audit/export` - Export audit CSV
- `GET /api/admin/analytics` - KPI analytics
- `GET /api/admin/alerts` - Live alerts (new users/content)

## 🎨 Frontend Features

### Screens
- **Landing**: CTA with feature highlights and trust badges
- **Creator Signup/Login**: Email/password auth with Terms/Privacy links
- **Feed**: Full-body content display, search, pull-to-refresh
- **Create Post**: Media URL required, client-side validation
- **Content Detail**: Full body + media display
- **Profile**: Creator info + posts
- **Settings**: Account info, logout, Help/Terms/Privacy links

### Key Components
- Full content body visible (no truncation)
- In-app Toast/Modal feedback (no native alerts)
- Pull-to-refresh on feed
- Search with debounce
- Loading states everywhere
- Suspended account detection with clear messaging

## 🛡️ Admin Panel Features

### Queue Management
- View pending content/users for moderation
- Bulk approve/reject/delete
- Assign to reviewers

### Content Management
- Full body display + media links
- Publish/unpublish/delete actions
- Creator info visible

### User Management
- Suspend/reactivate users
- Verify users
- Reset passwords

### Audit Log
- All admin actions logged
- CSV export

### Analytics
- KPI counts (creators, content, published, pending, etc.)
- Derived from real database queries

### Live Alerts
- New content & user signups (last 24h)
- Real-time or 30s auto-refresh

## 💾 Database Schema

### Key Tables
- `creators` - Creator profiles
- `creator_accounts` - Auth accounts linked to creators
- `content` - Posts (article, video_embed, image_story)
- `admins` - Admin accounts
- `moderation_queue` - Pending items
- `audit_log` - Action log
- `opportunities` - Job/partnership listings

## 🔐 Security

- ✅ JWT auth with token expiry (7 days default)
- ✅ Bcrypt password hashing
- ✅ CORS configured by origin
- ✅ rate limiting on auth endpoints
- ✅ Admin role enforcement (single-admin via logic)
- ✅ Suspended user blocking
- ✅ SQL injection protection (parameterized queries)
- ✅ XSS protection (HTML escaping in admin)

## 📱 Media Handling

### Default (Unsplash)
Seeds use curated Unsplash sports image URLs. No upload/S3 required for demo.

### Optional: AWS S3 / Cloudinary
1. Add environment variables:
   ```
   MEDIA_PROVIDER=s3
   AWS_S3_BUCKET=your-bucket
   AWS_ACCESS_KEY_ID=...
   AWS_SECRET_ACCESS_KEY=...
   ```

2. Update `backend/src/api.js` to handle multi-part uploads if adding upload feature.

## 📧 Email Handling

### Stub Mode (Dev Default)
Logs emails to console/file. Set `LOCAL_STUB_EMAIL=true` in `.env`.

### Real Providers
- Resend, SendGrid, AWS SES: Add provider keys to `.env`
- Reset password flows will work but use email-less tokens

## 🧪 Smoke Tests

Quick manual tests to verify setup:

```bash
# 1. Health check
curl http://localhost:3011/healthz

# 2. Creator signup
curl -X POST http://localhost:3011/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password1!","name":"Test User"}'

# 3. Create post with media
curl -X POST http://localhost:3011/api/content \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "content_type":"article",
    "title":"Test Post",
    "body":"Test body text",
    "media_url":"https://images.unsplash.com/photo-1461896836934-ffe607ba8211"
  }'

# 4. Get feed
curl http://localhost:3011/api/content

# 5. Admin login
curl -X POST http://localhost:3011/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@plxyground.local","password":"Internet2026@"}'

# 6. Get queue
curl http://localhost:3011/api/admin/queue \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

## 🚀 Auto-Start (One Command)

Run all services:
```bash
# From root directory
bash start-all.sh
```

Or manually:
```bash
# Terminal 1: Backend
cd backend && npm install && npm run seed && npm start

# Terminal 2: Frontend
cd frontend && npm install && npm run web

# Terminal 3: Admin
cd admin-panel && npm install && npm start
```

Then open:
- **Frontend**: http://localhost:19006
- **Admin**: http://localhost:3012
- **API**: http://localhost:3011

## 📝 Seeding & Demo Data

The seed script (`backend/src/scripts/seed.js`) creates:

- **1 Admin account**
  - Email: admin@plxyground.local
  - Password: Internet2026@

- **10 Creator accounts**
  - Including: Sarah Johnson, Marcus Elite, Alex Rivera, etc.
  - Password: Password1!

- **1 Business account**
  - Nike Sports
  - Email: nike@plxyground.local
  - Password: Password1!

- **100 Content posts** (10 per creator)
  - 70% published, 30% pending
  - Mixed content types (article, video_embed, image_story)
  - Media URLs from curated Unsplash sports images
  - Full body text for all posts

- **5 Opportunities** (job/partnership listings)

## 🛠️ Development

### Adding a New Endpoint

**Example: New Creator Route**

1. Create `backend/src/routes/newfeature.js`
2. Import in `backend/src/index.js`
3. Add route: `app.use('/api/newfeature', newFeatureRoutes)`
4. Use same auth/validation patterns

### Extending Frontend Screens

1. Add new component in `frontend/src/screens/`
2. Add navigation case in `frontend/index.js`
3. Use `useAuth()` for auth context
4. Use API calls from `frontend/src/api.js`

### Admin Panel: New Section

1. Create panel component in `admin-panel/src/App.jsx`
2. Add API calls via `admin-panel/src/api.js`
3. Add nav button in Navigation component
4. Add CSS styling

## 📦 Deployment Notes

### Environment Variables
- **Backend**: `DB_PROVIDER=postgres` for production (SQLite is dev-only)
- **JWT_SECRET**: Use a strong random key (e.g., `openssl rand -base64 32`)
- **CORS_ORIGIN**: Set to your frontend domain
- All ports fixed as specified (3011, 19006, 3012)

### Database
- SQLite for dev/demo
- PostgreSQL recommended for production
  - Set `DB_PROVIDER=postgres` and `DATABASE_URL=postgres://...`
  - Migration: Export seed script to SQL if needed

### Frontend Build
```bash
cd frontend
npm run build
# Outputs to expo build artifacts
```

### Admin Build
```bash
cd admin-panel
npm run build
# Outputs to dist/
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Find process on port 3011
lsof -i :3011
kill -9 <PID>
```

### Database Lock
```bash
# Reset SQLite (dev only)
rm backend/plxyground.db*
npm run seed
```

### CORS Errors
- Check `CORS_ORIGIN` in `.env` matches your frontend URL
- Ensure backend is running

### Token Not Persisting
- Check browser local/secure storage
- Verify frontend .env points to backend URL

## 📚 Further Reading

- [Express Documentation](https://expressjs.com/)
- [React Native Web Docs](https://necolas.github.io/react-native-web/)
- [JWT Best Practices](https://www.rfc-editor.org/rfc/rfc7519)
- [OWASP Security](https://owasp.org/www-project-web-security-testing-guide/)

## 📄 License

Proprietary - PLXYGROUND 2026

## 👥 Support

For issues or questions:
1. Check logs in terminal running services
2. Verify `.env` configuration
3. Run seed script again: `npm run seed`
4. Clear browser cache/storage

---

**Built with ❤️ for sports creators and brands worldwide.**
