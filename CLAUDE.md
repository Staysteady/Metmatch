# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MetMatch is an electronic trading communication platform for LME (London Metal Exchange) brokers, traders, and market makers. It's a monorepo with separate frontend (React) and backend (Express) applications using TypeScript throughout.

## Important Port Configuration

⚠️ **CRITICAL: Port Usage**
- Backend API runs on port **5001** (NOT 3000 or 3001)
- Frontend runs on port **5173** (Vite default)
- Ports 3000 and 3001 are **RESERVED** by other applications and must NOT be used

## Development Commands

### Initial Setup
```bash
# Start database
docker-compose up -d

# Install all dependencies (uses npm workspaces)
npm install

# Setup backend environment
cp backend/.env.example backend/.env

# Initialize database
cd backend
npx prisma generate
npx prisma db push
cd ..
```

### Running the Application
```bash
# Start both frontend and backend (from root)
npm run dev

# Or run separately:
npm run dev:backend  # API on http://localhost:5001
npm run dev:frontend # UI on http://localhost:5173
```

### Database Operations
```bash
# Run from backend directory
cd backend
npx prisma migrate dev     # Create and apply migrations
npx prisma db push         # Push schema changes without migration
npx prisma studio          # Open Prisma Studio GUI
npx prisma generate        # Regenerate Prisma client after schema changes
```

### Build Commands
```bash
# Build all workspaces
npm run build

# Backend specific
cd backend && npm run build

# Frontend specific  
cd frontend && npm run build
```

## Architecture Overview

### Authentication Flow
- JWT-based authentication with refresh tokens
- Tokens stored in AuthStore (Zustand) on frontend
- Authentication middleware (`backend/src/middleware/auth.middleware.ts`) protects routes
- Password validation includes strength requirements (uppercase, lowercase, number, special char)
- Role-based access control: TRADER, TRADER_MM, BROKER, ADMIN

### API Structure
Backend follows a layered architecture:
- **Controllers** handle HTTP requests/responses
- **Services** contain business logic (audit.service.ts, telemetry.service.ts)
- **Middleware** for auth, validation, error handling, telemetry
- **Routes** define API endpoints and apply middleware
- **Prisma** for database operations with PostgreSQL

### State Management
- **Frontend**: Zustand for auth state (`frontend/src/store/authStore.ts`)
- **Backend**: Stateless with JWT verification on each request
- **Database**: PostgreSQL with Prisma ORM, includes audit logging

### Key API Patterns
- All protected routes require `Authorization: Bearer <token>` header
- Validation uses Zod schemas with `validateRequest` middleware
- Error responses follow consistent format: `{ error: string, details?: array }`
- Audit logging tracks all significant user actions
- Telemetry middleware captures performance metrics

### Database Schema
Key models in `backend/prisma/schema.prisma`:
- **User**: Core user entity with authentication fields
- **RefreshToken**: JWT refresh token management
- **RFQ/RFQResponse**: Request for quote system
- **Order/Trade**: Order management and execution
- **MarketBroadcast**: Market-wide announcements
- **AuditLog**: Compliance and audit trail
- **TelemetryEvent/PerformanceMetric**: System monitoring

### Frontend Routing
React Router v6 with protected routes:
- Public: `/login`, `/register`
- Protected: `/dashboard`, `/rfqs`, `/orders`, `/profile`, `/market-broadcast`
- Admin: `/admin/*` routes (requires ADMIN role)

### Environment Variables
Critical backend environment variables (see backend/.env.example):
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Must be changed in production
- `PORT`: Backend server port (MUST be 5001)
- `FRONTEND_URL`: For CORS configuration

## Current Implementation Status

### Completed Epics
- **Epic 1**: User authentication system with JWT
- **Epic 2**: Business profile creation and management

### Active Features
- RFQ creation and management
- Order management system  
- Market broadcasts
- User profile management
- Session management
- Audit logging
- Telemetry collection

## Important Considerations

### When modifying authentication:
- Update both auth.controller.ts and auth.middleware.ts
- Ensure token refresh logic remains intact
- Test with expired tokens

### When adding new API endpoints:
1. Create route in `backend/src/routes/`
2. Add controller in `backend/src/controllers/`
3. Apply appropriate middleware (auth, validation)
4. Add to main router in `backend/src/index.ts`
5. Log actions via AuditService for compliance

### When modifying database schema:
1. Edit `backend/prisma/schema.prisma`
2. Run `npx prisma generate` to update client
3. Run `npx prisma db push` for development
4. Create migration with `npx prisma migrate dev` for production

### Frontend API integration:
- Use the configured axios instance from `frontend/src/services/api.ts`
- It automatically handles auth headers and token refresh
- Check response interceptors for error handling
- Default API URL is `http://localhost:5001/api`

### Ports and Services:
- Backend API: 5001 (⚠️ NEVER use 3000 or 3001)
- Frontend Dev: 5173 (Vite default)
- PostgreSQL: 5432 (via Docker)
- Telemetry endpoint: 5001 (same as main API)