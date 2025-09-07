# Technical Assumptions

## Repository Structure: Monorepo

**Decision:** Monorepo with npm workspaces containing packages/frontend, packages/backend, and packages/shared
**Rationale:** Solo developer with AI assistance benefits from single repository management, shared TypeScript types ensure consistency, easier refactoring and dependency management, simplified CI/CD pipeline

## Service Architecture

**CRITICAL DECISION - Modular Monolith Architecture:**
- Initial deployment as single Node.js application with clear service boundaries
- Service-oriented architecture with *.service.ts business logic separation
- Controller pattern (*.controller.ts) for HTTP request handling
- Repository-less data access pattern using Drizzle ORM directly
- Event-driven WebSocket communication via Socket.io
- Prepared for future microservices extraction post-MVP if needed

**Rationale:** Faster development for solo developer, reduced operational complexity initially, maintains flexibility for future scaling

## Testing Requirements

**CRITICAL DECISION - Comprehensive Testing Strategy:**
- Unit tests using Vitest for business logic (80%+ coverage requirement)
- Integration tests for all API endpoints
- E2E tests with Playwright for critical user workflows (RFQ flow, authentication, order management)
- Test success rate must exceed 80% before any deployment
- All new features require tests before merging
- Manual testing convenience methods for development
- Regression suite preventing existing feature breakage

**Rationale:** High reliability required for financial platform, automated testing enables confident refactoring, E2E tests catch integration issues early

## Additional Technical Assumptions and Requests

**Frontend Stack:**
- React 18 with TypeScript in strict mode for type safety
- Vite as build tool for fast development (port 5173)
- Zustand for lightweight state management
- Tailwind CSS with custom dark theme for consistent styling
- Socket.io client for real-time WebSocket communication
- React Router v6 for client-side routing with protected routes

**Backend Stack:**
- Node.js with Express.js API server (port 5001)
- TypeScript with ESM modules for modern JavaScript
- PostgreSQL (port 5434) as primary database
- Redis (port 6380) for session management and caching
- Drizzle ORM for type-safe database access
- JWT authentication with refresh tokens

**Development Environment:**
- Local development on MacBook Pro initially
- Docker Compose for containerized PostgreSQL and Redis
- Nodemon for backend auto-reload during development
- Concurrently for running multiple dev servers
- Migration to AWS cloud infrastructure post-launch

**Security & Compliance:**
- JWT tokens with 12-round bcrypt password hashing
- Helmet.js for security headers
- CORS configuration for API protection
- 7-year audit log retention capability from day one
- End-to-end encryption for sensitive data
- Rate limiting implementation planned

**Performance & Monitoring:**
- WebSocket latency target <100ms
- Support for 1000+ concurrent connections
- Comprehensive telemetry tracking from day one
- OpenTelemetry integration planned for observability
- Prometheus metrics export planned for monitoring

**Schema & Data Management:**
- Trading widget as single source of truth for all data schemas
- UK English spelling throughout (e.g., "Aluminium")
- Schema-driven field validation and formatting
- Drizzle migrations for database version control
- Zod for runtime schema validation

**External Integrations:**
- ElevenLabs API for voice synthesis (squawk box feature - Phase 2)
- Public RESTful API with OpenAPI documentation
- Webhook system for third-party integrations
- FIX protocol support planned for Phase 2

**Platform Boundaries:**
- No clearing or settlement functionality - pure communication platform
- No direct exchange data feeds initially - manual market entry
- No mobile app support - desktop browser only
- Weekend-only maintenance windows
