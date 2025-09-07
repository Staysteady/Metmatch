# Met Match Product Requirements Document (PRD)

## Goals and Background Context

### Goals

- Enable electronic trading communication between brokers, traders, and market makers on the LME, replacing inefficient phone-based workflows
- Provide instant multi-directional RFQ capabilities allowing any participant type to request quotes from others  
- Create network transparency showing who's trading, their capabilities, and market-making status in real-time
- Reduce RFQ response times from 2-5 minutes (phone) to under 30 seconds through electronic routing
- Establish compliance-ready platform with complete audit trails for all trading activities
- Deliver cost-effective alternative to Bloomberg terminals at fraction of the cost (£500-2000/month vs £24,000/year)
- Build scalable platform architecture ready for expansion beyond LME to other asset classes and markets
- Achieve critical mass of 100+ paying subscribers within 6 months leveraging existing LME member relationships

### Background Context

Met Match addresses the fundamental inefficiency in commodities trading where billions in volume operates through outdated phone calls and fragmented chat systems. Despite LME members having established due diligence relationships, traders lack visibility into counterparties' capabilities and availability, resulting in missed opportunities and slow execution. The platform leverages these existing relationships while providing the electronic infrastructure needed for modern trading, positioning itself as complementary to exchange trading by focusing on pre-trade communication and price discovery. With increasing regulatory scrutiny demanding better audit trails and the global shift toward electronic trading, Met Match provides a timely solution that transforms trading connectivity without requiring clearing or settlement capabilities.

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-09-07 | 1.0 | Initial PRD creation based on Project Brief | John Stedman |
| 2025-09-07 | 1.1 | Added Data Model, API Spec, Security, Monitoring, DR sections | John Stedman |

## Requirements

### Functional

- FR1: The platform must support three distinct user roles (Trader, Trader with Market-Making capabilities, Broker) plus Admin, with role-based permissions controlling feature access
- FR2: Users must be able to send multi-directional RFQs where any participant type can request quotes from any other type (broker→market maker, market maker→market maker, etc.)
- FR3: The main activity table must display real-time trading activities with tabbed filtering (All Activity, Orders, RFQs Received/Sent, Transactions, Counter Markets, Live Markets)
- FR4: The trading widget must support dual-mode operation: Market Broadcast Mode for sending prices to all parties, and Order/RFQ Mode for targeted requests
- FR5: The platform must maintain complete audit trails of all activities for 7 years with timestamps, user actions, and full request/response data
- FR6: RFQs must support broadcast to all eligible counterparties or selective targeting to specific participants
- FR7: The system must generate and send automated trade confirmations to designated emails (front office, back office, compliance)
- FR8: Admin panel must provide user management capabilities including search/filter, role assignment, activation/deactivation, and cascade deletion
- FR9: The platform must track and display real-time user status (active/away/busy) and trading capabilities/product coverage
- FR10: WebSocket connections must provide real-time updates for all trading activities with color-coded status indicators
- FR11: The platform must support schema-driven field configuration allowing industry-specific options (Buy/Sell/Borrow/Lend for metals)
- FR12: Users must be able to create counter-offers in response to RFQs with full negotiation tracking
- FR13: The platform must provide comprehensive telemetry tracking all user interactions with less than 2% performance impact
- FR14: Authentication system must use JWT tokens with refresh token mechanism and automatic permission provisioning based on role
- FR15: The platform must enforce due diligence verification before enabling trading between counterparties

### Non-Functional

- NFR1: Platform must achieve sub-100ms WebSocket latency for real-time updates
- NFR2: System must support 1000+ concurrent user connections without performance degradation  
- NFR3: Platform uptime must exceed 99.95% during market hours with automated monitoring and alerting
- NFR4: Page load times must not exceed 2 seconds on standard trading workstations
- NFR5: Platform must be accessible via Chrome 90+, Firefox 88+, Safari 14+, Edge 90+ on desktop only (1920x1080 minimum)
- NFR6: All sensitive data must be encrypted in transit and at rest using industry-standard encryption
- NFR7: The platform must provide API rate limiting and DDoS protection for security
- NFR8: Test coverage must reach 80% for all new features with regression testing for existing functionality
- NFR9: Platform maintenance must occur only on weekends with advance notification to users
- NFR10: System must provide exportable compliance reports within 2 hours of any audit request

## User Interface Design Goals

### Overall UX Vision

Create a professional, high-performance trading interface that replicates the efficiency of a physical trading floor in a digital environment. The platform should feel instantly familiar to traders while eliminating the friction of phone-based workflows. Every interaction should be optimized for speed, with critical actions achievable in one click. The dark professional theme (#0F1419 background) reduces eye strain during extended trading sessions while high-contrast data visualization ensures instant comprehension. Zero-click information architecture means all critical data is visible without interaction required.

### Key Interaction Paradigms

- **Unified Activity Dashboard:** Single command center combining live feed with smart sidebar widget for complete market visibility
- **Split-Screen Layout:** 75% main activity table / 25% trading widget sidebar maintains context while enabling quick actions
- **Color-Coded Status System:** Green (executed/buy), Yellow (pending), Red (cancelled/sell) for instant visual comprehension
- **Real-Time WebSocket Updates:** Zero-refresh architecture where all changes appear instantly across all connected users
- **Progressive Information Density:** Layered data reveals more detail on hover/expand without cluttering initial view
- **One-Click Actions:** Trade execution with single button press from any market view
- **Adaptive Layout System:** Widget dynamically changes fields based on strategy, product, and user context
- **Smooth Micro-Interactions:** 200ms transitions and pulsing indicators create premium feel without distraction

### Core Screens and Views

- **Main Trading Dashboard:** Combined activity table with trading widget showing all market activity in real-time
- **Login/Authentication Screen:** Secure entry with role-based routing to appropriate dashboard view
- **Admin Panel:** Comprehensive user management, system statistics, and platform configuration
- **User Profile/Settings:** Personal preferences, notification settings, trading capabilities configuration
- **Network Visualization:** Interactive map showing connections between traders, brokers, and market makers
- **Audit Trail Browser:** Searchable, filterable view of all historical platform activities

### The Widget: Platform's Core Innovation & Design System Source of Truth

**CRITICAL DESIGN PRINCIPLE:** The MarketBroadcastWidget establishes the canonical design patterns that must propagate throughout the entire platform. Every color, badge, field format, and interaction pattern defined in the widget becomes the single source of truth for the entire application. If it exists in the widget, it exists everywhere exactly the same way.

The MarketBroadcastWidget is the beating heart of Met Match's UX, positioned as a persistent right-side panel (25% screen width) that transforms based on context:

**Visual Design:**
- Slides smoothly from right edge preserving main content visibility
- Dark surface (#1E2329) with subtle border creates visual depth
- Compact mode reduces to essential fields when space-limited
- Badge system uses consistent color language throughout platform

**Badge & Status Color System (Canonical Colors - No Exceptions):**
- Green badges (#2E7D32): Active trades, buy orders, successful actions - used identically everywhere
- Red badges (#C62828): Sell orders, expired markets, cancelled states - consistent across all views
- Yellow badges (#FFC107): Pending actions, quotes awaiting response - same yellow in every context
- Blue badges (#1B365D): Neutral information, system messages - universal info color
- Gray badges (#78909C): Inactive states, historical data - standard inactive state
- Orange badges (#FF6F00): Platform Market Maker designation - exclusive MMM identifier

**User Flow Optimization:**
- Tab through fields in logical order for rapid data entry
- Enter key submits from any field for speed
- Escape key collapses widget to maximize screen space
- Recent trades show below for quick repeat actions
- One-click templates for common trades

**Dynamic Field Configuration:**
- Strategy selector instantly changes available fields
- Product dropdown with metal-specific accent colors
- Direction toggle flips between Buy/Sell/Borrow/Lend with color change
- Dynamic expiry dates auto-populate based on current month
- Real-time validation with inline error states

### Design System Consistency Mandate

**Centralized Theme System Architecture:**

Met Match uses a centralized theme system (lib/theme.ts) that defines all colors, component styles, and badge variants in one place. This creates a single source of truth for the entire application's visual language.

**Theme File Structure (lib/theme.ts):**
1. **Color Palette Definition:**
   - Primary, accent, success, warning, danger, purple color scales
   - All components reference these tokens, never define local colors

2. **Component Style Variants:**
   - trader: purple background/border (bg-purple-900/50 text-purple-400)
   - platformMarketMaker: yellow/amber (bg-yellow-900/50 text-yellow-400 border-yellow-800)
   - broker: blue background/border (bg-blue-900/50 text-blue-400)
   - success/warning/danger/info states using consistent color tokens

3. **Shared Design Tokens:**
   - Widget green 'Buy' button uses theme.colors.success
   - Badge 'Connected' status also uses theme.colors.success
   - Consistency through shared tokens, not component coupling

**Implementation Pattern:**
```
// In theme.ts:
badge.variants.platformMarketMaker = 'bg-yellow-900/50 text-yellow-400'

// Used in Badge.tsx:
<Badge variant="platformMarketMaker">Platform Market Maker</Badge>

// Widget uses same color family:
theme.colors.warning.400 = '#fbbf24' // Consistent yellow
```

**Schema-Driven Field Consistency:**
- Widget field definitions and formatting rules apply universally:
  - Price format: $2,500.00 (enforced everywhere via shared formatters)
  - Spelling: "Aluminium" (UK English throughout)
  - Quantity validation: Integers only if widget specifies
  - Dropdown options: Widget options become system-wide valid options

**Design Consistency Enforcement:**
- No component defines its own colors - all must reference theme.ts
- RoleBadge component automatically applies correct variant based on role
- componentStyles.badge.variants defines all badge appearances centrally
- Widget establishes trading patterns while theme system ensures visual consistency
- Single source of truth reduces cognitive load and ensures professional polish

### Accessibility: WCAG AA

The platform will meet WCAG AA standards for professional use, including:
- High contrast mode for extended screen viewing
- Clear focus indicators and error messaging
- Consistent navigation patterns across all screens
- Screen reader compatibility for compliance features

### Branding

Professional financial platform aesthetic with:
- Dark theme (#0F1419 background) optimized for all-day trading screen viewing
- SF Pro font stack with clear size distinctions for rapid scanning
- Typography hierarchy enabling quick information processing
- Tailwind CSS custom color palette (50-900 shades) for consistent design system
- Clean, data-dense layouts maximizing information per screen
- Lucide React icons for universal recognition
- Mobile-responsive drawer with collapsible navigation for space efficiency
- White-label ready architecture for client customization

### Target Device and Platforms: Desktop Browser Only

- **Primary:** Desktop browsers on trading workstations (1920x1080 minimum resolution)
- **Browsers:** Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **No Mobile Support:** Platform is explicitly desktop-only for professional trading environments
- **Multi-Monitor:** Support for traders using multiple screens with detachable widgets (Phase 2)

## Technical Assumptions

### Repository Structure: Monorepo

**Decision:** Monorepo with npm workspaces containing packages/frontend, packages/backend, and packages/shared
**Rationale:** Solo developer with AI assistance benefits from single repository management, shared TypeScript types ensure consistency, easier refactoring and dependency management, simplified CI/CD pipeline

### Service Architecture

**CRITICAL DECISION - Modular Monolith Architecture:**
- Initial deployment as single Node.js application with clear service boundaries
- Service-oriented architecture with *.service.ts business logic separation
- Controller pattern (*.controller.ts) for HTTP request handling
- Repository-less data access pattern using Drizzle ORM directly
- Event-driven WebSocket communication via Socket.io
- Prepared for future microservices extraction post-MVP if needed

**Rationale:** Faster development for solo developer, reduced operational complexity initially, maintains flexibility for future scaling

### Testing Requirements

**CRITICAL DECISION - Comprehensive Testing Strategy:**
- Unit tests using Vitest for business logic (80%+ coverage requirement)
- Integration tests for all API endpoints
- E2E tests with Playwright for critical user workflows (RFQ flow, authentication, order management)
- Test success rate must exceed 80% before any deployment
- All new features require tests before merging
- Manual testing convenience methods for development
- Regression suite preventing existing feature breakage

**Rationale:** High reliability required for financial platform, automated testing enables confident refactoring, E2E tests catch integration issues early

### Additional Technical Assumptions and Requests

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

## Epic List

**Epic 1: Foundation & Authentication Infrastructure** - Establish project setup, core authentication system with JWT tokens, role-based access control, and basic UI shell with main dashboard layout

**Epic 2: User Management & Admin Panel** - Create comprehensive user management system, admin panel with full CRUD operations, role assignment, and telemetry infrastructure for tracking all platform activities

**Epic 3: Core Trading Interface & Real-time Infrastructure** - Build main activity table with tabbed filtering, implement WebSocket infrastructure for real-time updates, create the MarketBroadcastWidget as the platform's core trading interface

**Epic 4: RFQ System & Order Management** - Implement multi-directional RFQ workflow allowing any participant to request quotes, build order management with confirmation system, enable counter-offer functionality with full negotiation tracking

**Epic 5: Network Intelligence & Discovery** - Create trader profiles with capabilities display, implement user status tracking, build network visualization showing connections between participants

**Epic 6: Compliance & Audit System** - Implement comprehensive audit logging with 7-year retention capability, create compliance reporting tools, build audit trail browser with search and export functionality

## Epic 1: Foundation & Authentication Infrastructure

Establish the core platform foundation with authentication, authorization, and basic UI structure to enable all subsequent development.

### Story 1.1: Project Setup & Development Environment

As a developer,
I want a properly configured monorepo with all necessary dependencies,
so that I can begin building the platform with a consistent development environment.

**Acceptance Criteria:**
1. Monorepo structure created with packages/frontend, packages/backend, packages/shared
2. TypeScript configuration with strict mode enabled across all packages
3. Docker Compose configuration for PostgreSQL (port 5434) and Redis (port 6380)
4. Vite configured for frontend development on port 5173
5. Express server configured for backend on port 5001
6. ESLint and Prettier configured with consistent rules
7. Git repository initialized with proper .gitignore
8. Package.json scripts for concurrent development (npm run dev starts all services)

### Story 1.2: JWT Authentication System

As a user,
I want to securely log in with email and password,
so that I can access the platform with my authenticated identity.

**Acceptance Criteria:**
1. Login endpoint accepts email/password and returns JWT + refresh token
2. Passwords hashed using bcrypt with 12 salt rounds
3. JWT tokens expire after 15 minutes, refresh tokens after 7 days
4. Refresh endpoint exchanges valid refresh token for new JWT
5: Logout endpoint invalidates refresh token in Redis
6. Protected route middleware validates JWT on all authenticated endpoints
7. Login attempts rate-limited to 5 per minute per IP
8. Secure httpOnly cookies used for token storage

### Story 1.3: Role-Based Access Control

As a platform administrator,
I want users to have role-based permissions,
so that features are appropriately restricted based on user type.

**Acceptance Criteria:**
1. Four roles implemented: TRADER, TRADER_MM (with market making), BROKER, ADMIN
2. Role stored in JWT token and database user record
3. Middleware enforces role-based access to API endpoints
4. Frontend routes protected based on user role
5. Role changes require admin permission and create audit log entry
6. Default permissions auto-assigned based on role at registration
7. Role visible in user profile and admin panel

### Story 1.4: Base UI Shell & Theme System

As a user,
I want a consistent dark-themed interface,
so that I can use the platform comfortably during extended trading sessions.

**Acceptance Criteria:**
1. Dark theme implemented with #0F1419 background color
2. Centralized theme.ts file with all color tokens and variants
3. Main layout with collapsible left navigation sidebar
4. Header with user profile dropdown and logout option
5. SF Pro font stack configured for optimal readability
6. Tailwind CSS configured with custom color palette
7. All components reference theme.ts tokens (no local color definitions)
8. 75/25 split layout prepared for activity table and widget

## Epic 2: User Management & Admin Panel

Create comprehensive user management capabilities and admin tools for platform oversight.

### Story 2.1: User Registration & Onboarding

As a new user,
I want to register for the platform with my trading details,
so that I can begin using Met Match for trading communication.

**Acceptance Criteria:**
1. Registration form captures: email, password, name, firm, role selection
2. Email validation with proper error messages
3. Password strength requirements enforced (min 8 chars, mixed case, number)
4. Auto-provisioning of default permissions based on selected role
5. Welcome email sent upon successful registration (Phase 2)
6. User redirected to appropriate dashboard based on role
7. Registration creates audit log entry
8. Duplicate email prevention with clear error message

### Story 2.2: Admin User Management Interface

As an admin,
I want to view and manage all platform users,
so that I can maintain platform security and user access.

**Acceptance Criteria:**
1. Admin panel displays paginated user list with search/filter
2. Filter by role, status (active/inactive), firm, registration date
3. User details expandable to show full profile information
4. Activate/deactivate users with confirmation dialog
5. Password reset generates temporary password and logs action
6. Cascade deletion removes all user data with confirmation
7. Export user list to CSV for reporting
8. All admin actions create audit log entries

### Story 2.3: Telemetry Infrastructure

As a platform operator,
I want comprehensive telemetry tracking,
so that I can monitor platform usage and diagnose issues.

**Acceptance Criteria:**
1. Frontend tracking captures all clicks, navigation, and interactions
2. Backend middleware logs all API calls with timing
3. WebSocket events tracked for connection stability
4. Performance metrics collected (page load, API response times)
5. Telemetry data buffered in Redis to prevent performance impact
6. Session replay capability for debugging user issues
7. Telemetry dashboard shows real-time platform metrics
8. Data retention for 30 days with aggregation for longer-term trends

### Story 2.4: User Profile & Settings

As a user,
I want to manage my profile and preferences,
so that I can customize my platform experience.

**Acceptance Criteria:**
1. Profile page allows editing: name, firm, contact details
2. Trading capabilities configuration (products, markets)
3. Notification preferences (email, platform notifications)
4. Password change with current password verification
5. Session management showing active sessions
6. Export personal data for GDPR compliance
7. Profile changes create audit log entries
8. Avatar upload capability (Phase 2)

## Epic 3: Core Trading Interface & Real-time Infrastructure

Build the main trading dashboard with real-time capabilities and the signature trading widget.

### Story 3.1: WebSocket Infrastructure

As a trader,
I want real-time updates of all trading activities,
so that I never miss market opportunities.

**Acceptance Criteria:**
1. Socket.io server configured with authentication
2. WebSocket connections authenticated using JWT
3. Automatic reconnection with exponential backoff
4. Connection status indicator in UI (connected/reconnecting/disconnected)
5. Room-based broadcasting for efficient message routing
6. Heartbeat mechanism to detect stale connections
7. Message queuing for offline users (delivered on reconnect)
8. <100ms latency for message delivery to connected clients

### Story 3.2: Main Activity Table

As a trader,
I want to see all trading activities in a unified feed,
so that I can monitor market activity efficiently.

**Acceptance Criteria:**
1. Activity table occupies 75% of screen width
2. Tabbed interface: All Activity, Orders, RFQs Received, RFQs Sent, Transactions, Counter Markets, Live Markets
3. Schema-driven columns: Time, Product, Direction, Quantity, Price, Counterparty, Status, Tenor, Prompt Date
4. Real-time updates via WebSocket (no page refresh required)
5. Color-coded status: green (executed), yellow (pending), red (cancelled)
6. Sortable columns with persistent sort preferences
7. Infinite scroll pagination for historical data
8. Export visible data to CSV

### Story 3.3: MarketBroadcastWidget Development

As a trader,
I want a smart trading widget for quick order entry,
so that I can execute trades with minimal friction.

**Acceptance Criteria:**
1. Widget occupies 25% right sidebar, slides in/out smoothly
2. Dual mode: Market Broadcast Mode and Order/RFQ Mode
3. Dynamic fields based on strategy selection (Carry/Outright/Options)
4. Product dropdown populated from configuration
5. Direction toggles: Buy/Sell/Borrow/Lend (product-specific)
6. Auto-populated expiry dates based on current month
7. Real-time validation with inline error messages
8. Recent trades displayed below for quick repeat
9. All styles reference theme.ts (widget is design system source)
10. Enter key submits from any field, Escape collapses widget

### Story 3.4: User Status & Presence

As a trader,
I want to see who's currently active on the platform,
so that I know who's available for trading.

**Acceptance Criteria:**
1. User status: Active (green), Away (yellow), Busy (red), Offline (gray)
2. Automatic away detection after 5 minutes of inactivity
3. Manual status setting with custom message option
4. Last seen timestamp for offline users
5. Status visible in user lists and trader profiles
6. WebSocket broadcasts status changes in real-time
7. Status persists across sessions until manually changed
8. Bulk status view showing all connected traders

## Epic 4: RFQ System & Order Management

Implement the core trading workflows for request-for-quotes and order management.

### Story 4.1: Multi-directional RFQ Creation

As any platform participant,
I want to send RFQs to other participants,
so that I can efficiently gather quotes and execute trades.

**Acceptance Criteria:**
1. RFQ creation from trading widget with all required fields
2. Any user type can send RFQs to any other type
3. Broadcast to all eligible participants or select specific recipients
4. RFQ includes: product, quantity, direction, tenor, special instructions
5. Expiry time configurable (default 5 minutes)
6. Draft RFQs auto-saved to prevent data loss
7. RFQ creation triggers WebSocket broadcast to recipients
8. Sender receives confirmation with RFQ reference number

### Story 4.2: RFQ Response & Negotiation

As a market maker,
I want to respond to RFQs with quotes,
so that I can win business and provide liquidity.

**Acceptance Criteria:**
1. RFQ notifications appear in activity feed and trigger desktop notification
2. Quick response form pre-populated with RFQ details
3. Quote includes price, quantity, validity period
4. Counter-offer capability with modified terms
5. Response history tracked showing all negotiations
6. Automatic expiry of quotes after specified time
7. Accept/reject buttons for received quotes
8. All RFQ actions create audit trail entries

### Story 4.3: Order Management Workflow

As a trader,
I want to manage orders from creation to confirmation,
so that I have clear visibility of my trading activity.

**Acceptance Criteria:**
1. Orders created from accepted RFQs or direct entry
2. Order states: Draft, Submitted, Working, Filled, Cancelled
3. Order modification allowed while in Working state
4. Confirmation generated upon fill with all trade details
5. Brokers can only create RFQs, not direct orders
6. Order book view showing all active orders
7. Order history with search and filter capabilities
8. Real-time order status updates via WebSocket

### Story 4.4: Trade Confirmation System

As a compliance officer,
I want automatic trade confirmations sent to all required parties,
so that we maintain proper records and comply with regulations.

**Acceptance Criteria:**
1. Confirmations auto-generated upon trade execution
2. PDF format with all trade details and timestamps
3. Sent to configured emails: front office, back office, compliance
4. Confirmation includes unique trade ID and counterparty details
5. Delivery status tracked with retry mechanism for failures
6. Confirmations stored in platform for retrieval
7. Bulk confirmation export for date ranges
8. Template customizable per firm requirements (Phase 2)

## Epic 5: Network Intelligence & Discovery

Create features that help users discover and connect with trading partners.

### Story 5.1: Trader Profile System

As a trader,
I want detailed profiles showing capabilities,
so that I can identify the right counterparties for my trades.

**Acceptance Criteria:**
1. Profile displays: name, firm, role, products traded, markets covered
2. Trading capabilities editable by user
3. Market maker badge prominently displayed where applicable
4. Biography section for additional context (Phase 2)
5. Contact preferences and communication methods
6. Profile completeness indicator encouraging full profiles
7. Profiles searchable by product, market, firm
8. View count and last active timestamp visible

### Story 5.2: Network Visualization

As a user,
I want to visualize the trading network,
so that I can understand market connections and find new counterparties.

**Acceptance Criteria:**
1. Interactive network graph showing all platform participants
2. Nodes represent users, edges represent trading relationships
3. Node size based on trading activity volume
4. Color coding by role (trader, broker, market maker)
5. Zoom and pan capabilities for exploration
6. Click node for detailed profile popup
7. Filter by product, firm, date range
8. Export network diagram as image

### Story 5.3: Counterparty Discovery

As a broker,
I want to discover new market makers,
so that I can expand my network and improve execution.

**Acceptance Criteria:**
1. Discovery page with advanced search filters
2. Filter by: role, products, firm size, activity level
3. Suggested connections based on trading patterns
4. Request connection feature with message
5. Connection requests require acceptance
6. Due diligence status indicator (verified/pending)
7. Bookmark favorite counterparties for quick access
8. New user notifications for relevant matches

## Epic 6: Compliance & Audit System

Implement comprehensive compliance features and audit capabilities required for financial platforms.

### Story 6.1: Comprehensive Audit Logging

As a compliance officer,
I want complete audit trails of all platform activities,
so that we can meet regulatory requirements and investigate issues.

**Acceptance Criteria:**
1. Every user action logged with timestamp and full context
2. Immutable audit log with cryptographic verification
3. 7-year retention with automated archival
4. Audit entries include: user, action, timestamp, IP, changes
5. Database triggers ensure no action escapes logging
6. Audit log protected from modification even by admins
7. Performance impact <2% from audit logging
8. Automated daily backup of audit logs

### Story 6.2: Audit Trail Browser

As a compliance officer,
I want to search and review audit trails,
so that I can investigate specific activities and generate reports.

**Acceptance Criteria:**
1. Web interface for searching audit logs
2. Filter by: user, date range, action type, IP address
3. Full-text search across audit entries
4. Results paginated with export to CSV/PDF
5. Drill-down to see complete entry details
6. Audit log access itself is audited
7. Read-only access with no modification capability
8. Saved searches for common queries

### Story 6.3: Compliance Reporting

As a compliance officer,
I want automated compliance reports,
so that we can efficiently meet regulatory reporting requirements.

**Acceptance Criteria:**
1. Standard reports: daily activity, user access, trade summary
2. Custom report builder with drag-drop fields
3. Scheduled reports with email delivery
4. Reports generated within 2 hours of request
5. PDF and Excel export formats
6. Report templates for common regulatory requirements
7. Historical report archive with version control
8. Report generation tracked in audit log

## Checklist Results Report

### Executive Summary

**Overall PRD Completeness:** 95%
**MVP Scope Appropriateness:** Just Right
**Readiness for Architecture Phase:** Ready
**Critical Gaps:** None identified - all essential elements present

### Category Analysis

| Category | Status | Critical Issues |
|----------|--------|-----------------|
| 1. Problem Definition & Context | PASS | None - clear problem statement with quantified impact |
| 2. MVP Scope Definition | PASS | None - well-defined MVP with clear boundaries |
| 3. User Experience Requirements | PASS | None - comprehensive UI/UX goals with design system |
| 4. Functional Requirements | PASS | None - 15 detailed functional requirements |
| 5. Non-Functional Requirements | PASS | None - 10 NFRs covering performance, security, reliability |
| 6. Epic & Story Structure | PASS | None - 6 epics with 22 detailed stories |
| 7. Technical Guidance | PASS | None - clear tech stack and architecture decisions |
| 8. Cross-Functional Requirements | PARTIAL | Missing detailed data model specification |
| 9. Clarity & Communication | PASS | None - clear language and structure throughout |

### Top Issues by Priority

**BLOCKERS:** None

**HIGH:**
- Data model and schema details should be defined before development begins
- API endpoint specifications needed for public API implementation

**MEDIUM:**
- Customer support chatbot implementation details not specified
- White-label customization options not fully detailed

**LOW:**
- Phase 2 features (squawk box, mobile) mentioned but not fully scoped
- Telemetry dashboard specifications could be more detailed

### MVP Scope Assessment

**Features Appropriately Scoped:**
- Core trading functionality (RFQ, orders, market broadcasting)
- Essential user management and authentication
- Required compliance and audit features
- Real-time WebSocket infrastructure

**Complexity Appropriate:**
- 22 stories achievable by solo developer with AI assistance
- Each story sized for 2-4 hour development sessions
- Clear acceptance criteria prevent scope creep

**Timeline Realistic:**
- 6-month MVP timeline achievable with focused development
- Sequential epic structure allows incremental delivery
- Foundation established before complex features

### Technical Readiness

**Clear Technical Constraints:**
- Monorepo structure defined
- Tech stack specified (React, Node.js, PostgreSQL, Redis)
- Performance requirements quantified (<100ms WebSocket latency)
- Security requirements established (JWT, bcrypt, 7-year audit retention)

**Identified Technical Risks:**
- WebSocket scalability beyond 1000 concurrent users needs testing
- 7-year audit retention requires robust archival strategy
- Real-time performance under high load needs validation

**Areas for Architect Investigation:**
- Optimal WebSocket architecture for scale
- Audit log storage and retrieval strategy
- Schema migration approach with Drizzle ORM

### Recommendations

1. **Before Development Starts:**
   - Create detailed data model diagram
   - Define all API endpoints with request/response schemas
   - Establish WebSocket event protocol documentation

2. **During Epic 1:**
   - Set up comprehensive logging and monitoring
   - Establish testing framework with CI/CD pipeline
   - Create development environment documentation

3. **Continuous Improvements:**
   - Maintain story completion velocity tracking
   - Regular user feedback sessions after Epic 3
   - Performance benchmarking after Epic 4

### Final Decision

**✅ READY FOR ARCHITECT:** The PRD and epics are comprehensive, properly structured, and ready for architectural design. The document provides clear business requirements, technical constraints, and user stories that can guide implementation.

## Next Steps

### Immediate Actions

1. Review and approve this PRD with stakeholders
2. Create technical architecture document based on these requirements
3. Set up development environment per Story 1.1
4. Begin Epic 1 implementation with authentication system
5. Establish Git repository and branching strategy

### UX Expert Prompt

"Review the Met Match PRD focusing on the UI/UX Design Goals section. Create detailed wireframes for the main trading dashboard showing the 75/25 split layout with activity table and MarketBroadcastWidget. Ensure all designs follow the centralized theme system defined in lib/theme.ts with consistent color tokens and the dark theme (#0F1419 background). Pay special attention to the widget as the design system source of truth."

### Architect Prompt

"Create a comprehensive technical architecture document for Met Match based on this PRD. Focus on: 1) Detailed system architecture using the specified monorepo structure with React/TypeScript frontend and Node.js/Express backend, 2) Database schema design for PostgreSQL with Drizzle ORM migrations, 3) WebSocket architecture using Socket.io for <100ms latency with 1000+ concurrent connections, 4) Security architecture with JWT authentication and 7-year audit retention, 5) API design following RESTful principles with OpenAPI documentation. Ensure all technical decisions align with the constraints of solo development with AI assistance."

## Data Model & Schema Specification

### Core Entities and Relationships

The Met Match platform uses a normalized relational database structure optimized for trading workflows and compliance requirements.

#### Users & Authentication
```sql
users {
  id: uuid PRIMARY KEY
  email: string UNIQUE NOT NULL
  password_hash: string NOT NULL
  role: enum('TRADER', 'TRADER_MM', 'BROKER', 'ADMIN')
  firm_name: string NOT NULL
  first_name: string NOT NULL
  last_name: string NOT NULL
  status: enum('ACTIVE', 'INACTIVE', 'SUSPENDED')
  cached_permissions: jsonb
  created_at: timestamp
  updated_at: timestamp
  last_login_at: timestamp
}
```

#### RFQ System
```sql
rfqs {
  id: uuid PRIMARY KEY
  creator_id: uuid REFERENCES users
  product: string NOT NULL
  direction: enum('BUY', 'SELL', 'BORROW', 'LEND')
  quantity: integer NOT NULL
  tenor: string
  prompt_date: date
  expiry_time: timestamp NOT NULL
  broadcast_type: enum('ALL', 'SELECTIVE')
  recipient_ids: uuid[]
  status: enum('ACTIVE', 'EXPIRED', 'CANCELLED', 'FILLED')
  special_instructions: text
  created_at: timestamp
}

rfq_responses {
  id: uuid PRIMARY KEY
  rfq_id: uuid REFERENCES rfqs
  responder_id: uuid REFERENCES users
  price: decimal(10,2) NOT NULL
  quantity: integer NOT NULL
  validity_period: integer (minutes)
  status: enum('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED')
  counter_offer: boolean DEFAULT false
  created_at: timestamp
}
```

#### Orders & Trades
```sql
orders {
  id: uuid PRIMARY KEY
  rfq_id: uuid REFERENCES rfqs
  trader_id: uuid REFERENCES users
  broker_id: uuid REFERENCES users
  product: string NOT NULL
  direction: enum('BUY', 'SELL', 'BORROW', 'LEND')
  quantity: integer NOT NULL
  price: decimal(10,2) NOT NULL
  status: enum('DRAFT', 'SUBMITTED', 'WORKING', 'FILLED', 'CANCELLED')
  created_at: timestamp
  filled_at: timestamp
}

trades {
  id: uuid PRIMARY KEY
  order_id: uuid REFERENCES orders
  trade_ref: string UNIQUE NOT NULL
  execution_price: decimal(10,2) NOT NULL
  execution_quantity: integer NOT NULL
  confirmation_sent: boolean DEFAULT false
  confirmation_emails: jsonb
  created_at: timestamp
}
```

#### Market Broadcasting
```sql
market_broadcasts {
  id: uuid PRIMARY KEY
  broadcaster_id: uuid REFERENCES users
  product: string NOT NULL
  direction: enum('BUY', 'SELL', 'BORROW', 'LEND')
  quantity: integer NOT NULL
  price: decimal(10,2) NOT NULL
  tenor: string
  prompt_date: date
  status: enum('LIVE', 'EXPIRED', 'CANCELLED')
  created_at: timestamp
  expires_at: timestamp
}

counter_markets {
  id: uuid PRIMARY KEY
  market_broadcast_id: uuid REFERENCES market_broadcasts
  trader_id: uuid REFERENCES users
  direction: enum('BUY', 'SELL', 'BORROW', 'LEND')
  price: decimal(10,2) NOT NULL
  quantity: integer NOT NULL
  status: enum('PENDING', 'ACCEPTED', 'REJECTED')
  created_at: timestamp
}
```

#### Network & Connections
```sql
connections {
  id: uuid PRIMARY KEY
  requester_id: uuid REFERENCES users
  target_id: uuid REFERENCES users
  connection_type: enum('BROKER_TRADER', 'MARKET_MAKER')
  status: enum('PENDING', 'ACCEPTED', 'REJECTED')
  due_diligence_status: enum('NOT_STARTED', 'PENDING', 'VERIFIED')
  created_at: timestamp
  accepted_at: timestamp
}
```

#### Compliance & Audit
```sql
audit_logs {
  id: uuid PRIMARY KEY
  user_id: uuid REFERENCES users
  action: string NOT NULL
  entity_type: string
  entity_id: uuid
  ip_address: inet
  user_agent: string
  request_body: jsonb
  response_body: jsonb
  status_code: integer
  timestamp: timestamp NOT NULL
  checksum: string NOT NULL -- For tamper detection
}

telemetry_events {
  id: uuid PRIMARY KEY
  session_id: uuid NOT NULL
  user_id: uuid REFERENCES users
  event_type: string NOT NULL
  event_data: jsonb
  page_url: string
  timestamp: timestamp NOT NULL
}
```

### Performance Indexes
```sql
CREATE INDEX idx_rfqs_creator_status ON rfqs(creator_id, status);
CREATE INDEX idx_rfqs_expiry ON rfqs(expiry_time);
CREATE INDEX idx_orders_trader_broker ON orders(trader_id, broker_id);
CREATE INDEX idx_audit_logs_user_timestamp ON audit_logs(user_id, timestamp);
CREATE INDEX idx_connections_users ON connections(requester_id, target_id);
```

## API Specification

### Authentication Endpoints

#### POST /api/auth/register
```json
Request:
  email: string
  password: string
  first_name: string
  last_name: string
  firm_name: string
  role: TRADER | TRADER_MM | BROKER

Response:
  user: User
  access_token: string
  refresh_token: string
```

#### POST /api/auth/login
```json
Request:
  email: string
  password: string

Response:
  user: User
  access_token: string
  refresh_token: string
```

#### POST /api/auth/refresh
```json
Request:
  refresh_token: string

Response:
  access_token: string
  refresh_token: string
```

### RFQ Endpoints

#### POST /api/rfqs
```json
Request:
  product: string
  direction: BUY | SELL | BORROW | LEND
  quantity: number
  tenor?: string
  prompt_date?: string
  expiry_minutes: number (default: 5)
  broadcast_type: ALL | SELECTIVE
  recipient_ids?: string[]
  special_instructions?: string

Response:
  rfq: RFQ
  reference_number: string
```

#### GET /api/rfqs
```json
Query:
  status?: ACTIVE | EXPIRED | CANCELLED | FILLED
  direction?: BUY | SELL | BORROW | LEND
  product?: string
  page: number
  limit: number

Response:
  rfqs: RFQ[]
  total: number
  page: number
```

#### POST /api/rfqs/:id/respond
```json
Request:
  price: number
  quantity: number
  validity_minutes: number
  counter_offer: boolean

Response:
  response: RFQResponse
```

### Order Management Endpoints

#### GET /api/orders
```json
Query:
  status?: DRAFT | SUBMITTED | WORKING | FILLED | CANCELLED
  page: number
  limit: number

Response:
  orders: Order[]
  total: number
```

#### POST /api/orders/:id/confirm
```json
Response:
  trade: Trade
  confirmation_sent: boolean
```

### Market Broadcast Endpoints

#### POST /api/markets/broadcast
```json
Request:
  product: string
  direction: BUY | SELL | BORROW | LEND
  quantity: number
  price: number
  tenor?: string
  prompt_date?: string
  expires_in_minutes: number

Response:
  broadcast: MarketBroadcast
```

### WebSocket Events

#### Client → Server Events
- `authenticate`: Token authentication
- `subscribe`: Channel subscription
- `rfq-create`: Create new RFQ
- `rfq-respond`: Respond to RFQ
- `order-update`: Update order status
- `set-status`: Update user status

#### Server → Client Events
- `rfq-received`: New RFQ notification
- `rfq-response-received`: RFQ response notification
- `order-status-changed`: Order status update
- `market-broadcast-new`: New market broadcast
- `user-status-changed`: User status change
- `connection-request`: New connection request

## Performance & Scalability Specifications

### Performance Benchmarks

#### Response Times
- **API Endpoints:**
  - P50: <50ms
  - P95: <100ms
  - P99: <200ms

- **WebSocket Latency:**
  - Message Delivery: <100ms (P95)
  - Connection Establishment: <500ms
  - Reconnection: <2s

- **Page Load:**
  - First Contentful Paint: <1.5s
  - Time to Interactive: <2.5s
  - Largest Contentful Paint: <3s

#### Throughput
- API: 10,000 requests/second
- WebSocket: 50,000 concurrent connections
- Database: 5,000 transactions/second

#### Resource Usage
- Backend Pod: 2 CPU cores, 4GB RAM per 1000 users
- Database: 100GB storage per million trades
- Redis: 2GB RAM per 10,000 active sessions

### Scalability Plan

**Phase 1 (0-1000 users):**
- Single backend instance
- PostgreSQL primary with read replica
- Redis single instance
- Estimated Cost: $500/month

**Phase 2 (1000-10,000 users):**
- 3 backend instances with load balancer
- PostgreSQL primary with 2 read replicas
- Redis cluster (3 nodes)
- CDN for static assets
- Estimated Cost: $2,500/month

**Phase 3 (10,000+ users):**
- Auto-scaling backend (3-10 instances)
- PostgreSQL with sharding by firm_id
- Redis cluster (6 nodes)
- Global CDN
- Multi-region deployment
- Estimated Cost: $10,000/month

## Security Specifications

### Authentication & Authorization

#### JWT Configuration
- Algorithm: RS256
- Access Token TTL: 15 minutes
- Refresh Token TTL: 7 days
- Token Storage: httpOnly secure cookies + localStorage (backup)

#### Password Policy
- Minimum Length: 8 characters
- Requirements: 1 uppercase, 1 lowercase, 1 number
- Bcrypt Rounds: 12
- Password History: Last 5 passwords cannot be reused

#### Session Management
- Concurrent Sessions: Maximum 3 per user
- Idle Timeout: 30 minutes
- Absolute Timeout: 12 hours

### Rate Limiting

#### Global Limits
- Default: 100 requests/minute per IP
- Authenticated: 200 requests/minute per user

#### Endpoint-Specific
- `/api/auth/login`: 5 attempts/minute per IP
- `/api/auth/register`: 3 requests/hour per IP
- `/api/rfqs POST`: 30 requests/minute per user
- `/api/orders POST`: 50 requests/minute per user
- WebSocket messages: 100 messages/minute per connection

#### Response Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1704626400
```

### Data Encryption

#### In Transit
- Protocol: TLS 1.3 minimum
- Cipher Suites: ECDHE-RSA-AES256-GCM-SHA384 preferred
- HSTS: max-age=31536000; includeSubDomains

#### At Rest
- Database: AES-256 encryption for sensitive fields
- Sensitive Fields: password_hash, personal_data, trade_details
- Key Management: AWS KMS or HashiCorp Vault
- Backup Encryption: AES-256 with separate key

#### PII Handling
- Masking: Last 4 digits only for sensitive IDs
- Logging: No PII in logs except audit trail
- Export: Encrypted ZIP with password protection

## Error Handling & Response Standards

### Standard Error Response Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "field": "quantity",
      "reason": "Must be a positive integer"
    },
    "request_id": "req_abc123",
    "timestamp": "2025-01-07T10:30:00Z"
  }
}
```

### Error Codes

#### Authentication
- `AUTH_INVALID_CREDENTIALS`: Invalid email or password
- `AUTH_TOKEN_EXPIRED`: JWT token has expired
- `AUTH_TOKEN_INVALID`: Invalid or malformed token
- `AUTH_INSUFFICIENT_PERMISSIONS`: User lacks required permissions
- `AUTH_ACCOUNT_SUSPENDED`: Account has been suspended

#### Validation
- `VALIDATION_ERROR`: General validation failure
- `VALIDATION_REQUIRED_FIELD`: Required field missing
- `VALIDATION_INVALID_FORMAT`: Invalid data format
- `VALIDATION_OUT_OF_RANGE`: Value outside acceptable range

#### Business Logic
- `RFQ_EXPIRED`: RFQ has expired
- `RFQ_ALREADY_FILLED`: RFQ already filled
- `ORDER_CANNOT_MODIFY`: Order in non-modifiable state
- `INSUFFICIENT_RELATIONSHIP`: No verified connection exists
- `DUPLICATE_ENTRY`: Record already exists

#### System
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `SERVICE_UNAVAILABLE`: Service temporarily unavailable
- `INTERNAL_ERROR`: Unexpected server error
- `WEBSOCKET_CONNECTION_FAILED`: Unable to establish WebSocket connection

### Retry Policies

#### Retryable Operations
- Email sending: 3 attempts with exponential backoff (1s, 2s, 4s)
- Trade confirmations: 5 attempts over 30 minutes
- WebSocket reconnection: Infinite with exponential backoff (max 30s)
- External API calls: 3 attempts with 1s delay

#### Non-Retryable
- Authentication failures
- Validation errors
- Business logic violations
- Explicit user cancellations

## Monitoring & Observability

### Key Metrics

#### Business Metrics
- Active users (DAU/MAU)
- RFQs created per hour
- RFQ response rate
- Average time to quote
- Trade completion rate
- User session duration

#### Technical Metrics
- API response times (P50, P95, P99)
- WebSocket connection count
- Message delivery latency
- Database query performance
- Error rates by endpoint
- CPU/Memory utilization

#### User Experience
- Page load times
- JavaScript error rate
- Failed API calls
- WebSocket reconnection rate
- Session crash rate

### Alerting Thresholds

#### Critical (Page immediately)
- API error rate >5%
- Database connection pool exhausted
- WebSocket server down
- Authentication service failure
- Trade confirmation failure rate >1%

#### High (Notify on-call)
- API P99 latency >500ms
- WebSocket connections >80% capacity
- Disk usage >80%
- Memory usage >85%
- Failed login attempts >100/minute

#### Medium (Notify team)
- RFQ response rate <50%
- User session errors >2%
- Slow database queries >1s
- Background job failures >5%

### Logging Strategy

#### Log Levels
- ERROR: System errors, failed operations
- WARN: Deprecated usage, performance issues
- INFO: User actions, business events
- DEBUG: Detailed execution flow (dev only)

#### Structured Logging
```json
{
  "timestamp": "2025-01-07T10:30:00Z",
  "level": "INFO",
  "request_id": "req_abc123",
  "user_id": "usr_def456",
  "action": "rfq_created",
  "duration_ms": 45,
  "status_code": 200
}
```

#### Log Retention
- Application Logs: 30 days
- Audit Logs: 7 years
- Performance Logs: 90 days
- Debug Logs: 7 days

## Deployment & DevOps

### Deployment Strategy

#### Environment Pipeline
- Development: Auto-deploy on commit to develop branch
- Staging: Auto-deploy on PR merge to main
- Production: Manual approval required

#### Deployment Method
- Strategy: Blue-Green deployment
- Rollback Time: <2 minutes
- Health Checks: Required before traffic switch
- Canary Testing: 10% traffic for 30 minutes

#### Database Migrations
- Tool: Drizzle ORM migrations
- Strategy: Forward-only migrations
- Rollback: Via compensating migrations
- Testing: Required on staging before production

### Infrastructure as Code

#### Terraform Modules
- VPC and networking
- ECS/EKS cluster
- RDS PostgreSQL
- ElastiCache Redis
- ALB/NLB load balancers
- CloudWatch monitoring
- S3 for backups

#### CI/CD Pipeline
1. Code commit triggers webhook
2. Run linting and type checking
3. Execute unit tests (must pass 80%)
4. Execute integration tests
5. Build Docker images
6. Push to registry
7. Deploy to environment
8. Run smoke tests
9. Notify team of result

## Disaster Recovery & Business Continuity

### Backup Strategy

#### Database Backups
- Frequency: Every 6 hours
- Retention: 30 days
- Type: Full backup + WAL archiving
- Test Restore: Weekly automated test

#### Application State
- Redis: AOF persistence every second
- Sessions: Backed up to PostgreSQL
- File Uploads: S3 with versioning

#### Audit Logs
- Real-time: Stream to S3
- Archive: Monthly to Glacier
- Retention: 7 years minimum

### Recovery Targets

#### RTO (Recovery Time Objective)
- Critical Systems: 30 minutes
- Full Platform: 2 hours
- Historical Data: 24 hours

#### RPO (Recovery Point Objective)
- Trades/Orders: 0 minutes (synchronous replication)
- User Data: 5 minutes
- Audit Logs: 1 minute
- Telemetry: 1 hour acceptable loss

### Incident Response

#### Severity Levels
- SEV1: Platform down, data loss risk
- SEV2: Major feature unavailable
- SEV3: Minor feature degraded
- SEV4: Cosmetic issues

#### Response Times
- SEV1: 15 minutes
- SEV2: 1 hour
- SEV3: 4 hours
- SEV4: Next business day

#### Communication
- Status Page: status.metmatch.com
- Email Updates: Every 30 minutes during incident
- Post-Mortem: Within 48 hours for SEV1/SEV2

## Compliance & Regulatory

### Data Governance

#### Data Classification
- Public: Marketing content, product info
- Internal: Telemetry, performance metrics
- Confidential: User profiles, trading data
- Restricted: PII, authentication credentials

#### Data Residency
- EU Users: Data stored in EU-WEST region
- US Users: Data stored in US-EAST region
- Backup: Cross-region replication allowed

#### Right to be Forgotten
- Request Process: Via support ticket
- Completion Time: 30 days
- Scope: All PII except audit logs
- Verification: Identity confirmation required

### Audit & Compliance Reports

#### Standard Reports
- Daily Trading Summary
- User Access Report
- Failed Authentication Report
- Data Export/Import Log
- System Change Log

#### Regulatory Reports
- MiFID II Transaction Report (EU)
- Best Execution Report
- Conflicts of Interest Log
- Client Asset Report

#### Report Formats
- PDF: Signed and timestamped
- CSV: For data analysis
- XML: For regulatory submission

## Testing Strategy

### Test Coverage Requirements

#### Unit Tests
- Target: 80% code coverage
- Critical Paths: 95% coverage required
- Focus: Business logic, calculations, validators

#### Integration Tests
- All API endpoints
- Database operations
- WebSocket events
- Third-party integrations

#### E2E Tests
- User Registration Flow
- RFQ Creation and Response
- Order Execution Flow
- Market Broadcast Flow
- Counter Offer Flow

#### Performance Tests
- Load Test: 1000 concurrent users
- Stress Test: Find breaking point
- Soak Test: 24 hours continuous load
- Spike Test: 10x sudden traffic increase

### Test Data Management

#### Test Data Sets
- Minimal: 10 users, 100 trades
- Standard: 100 users, 10,000 trades
- Large: 1000 users, 1M trades

#### Data Generation
- Faker.js for synthetic data
- Anonymized production samples
- Edge case specific datasets

#### Environment Reset
- Development: On demand
- Staging: Daily at 2 AM
- E2E: Before each test run

## Data Retention Policy

### Active Data Management

#### PostgreSQL (Primary Database)
- Active Trading Data: 1 year in primary tables
- User Profiles: Retained while account active
- RFQs: 90 days in active tables, then archived
- Orders/Trades: 1 year active, then archived

#### Archive Strategy
- Monthly archival job moves old data to archive tables
- Archive tables use partitioning by month
- Archived data queryable but with slower performance
- After 7 years, data exported to cold storage

#### Redis (Cache/Session)
- Sessions: 24 hours TTL
- Cache: Variable TTL based on data type
- Telemetry Buffer: Flushed every 5 minutes

### GDPR Compliance

#### Data Subject Rights
- Access: Export all user data within 72 hours
- Rectification: Edit profile data immediately
- Erasure: Delete PII within 30 days (except audit logs)
- Portability: Export in JSON/CSV format

#### Data Minimization
- Collect only necessary trading data
- Automatic PII removal from logs
- Regular review of data collection practices

#### Consent Management
- Explicit consent for data processing
- Granular consent options
- Consent withdrawal mechanism
- Consent audit trail

### Backup Retention

#### Retention Periods
- Daily Backups: 7 days
- Weekly Backups: 4 weeks
- Monthly Backups: 12 months
- Annual Backups: 7 years

#### Storage Tiers
- Hot (0-30 days): Instant access
- Warm (30-365 days): <4 hour retrieval
- Cold (1-7 years): <24 hour retrieval
- Archive (7+ years): 48 hour retrieval

---

## Document Information

**Document:** Met Match Product Requirements Document (PRD)
**Version:** 1.1
**Date:** 2025-09-07
**Author:** John Stedman
**Status:** Complete - Ready for Architecture Phase