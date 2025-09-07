# User Interface Design Goals

## Overall UX Vision

Create a professional, high-performance trading interface that replicates the efficiency of a physical trading floor in a digital environment. The platform should feel instantly familiar to traders while eliminating the friction of phone-based workflows. Every interaction should be optimized for speed, with critical actions achievable in one click. The dark professional theme (#0F1419 background) reduces eye strain during extended trading sessions while high-contrast data visualization ensures instant comprehension. Zero-click information architecture means all critical data is visible without interaction required.

## Key Interaction Paradigms

- **Unified Activity Dashboard:** Single command center combining live feed with smart sidebar widget for complete market visibility
- **Split-Screen Layout:** 75% main activity table / 25% trading widget sidebar maintains context while enabling quick actions
- **Color-Coded Status System:** Green (executed/buy), Yellow (pending), Red (cancelled/sell) for instant visual comprehension
- **Real-Time WebSocket Updates:** Zero-refresh architecture where all changes appear instantly across all connected users
- **Progressive Information Density:** Layered data reveals more detail on hover/expand without cluttering initial view
- **One-Click Actions:** Trade execution with single button press from any market view
- **Adaptive Layout System:** Widget dynamically changes fields based on strategy, product, and user context
- **Smooth Micro-Interactions:** 200ms transitions and pulsing indicators create premium feel without distraction

## Core Screens and Views

- **Main Trading Dashboard:** Combined activity table with trading widget showing all market activity in real-time
- **Login/Authentication Screen:** Secure entry with role-based routing to appropriate dashboard view
- **Admin Panel:** Comprehensive user management, system statistics, and platform configuration
- **User Profile/Settings:** Personal preferences, notification settings, trading capabilities configuration
- **Network Visualization:** Interactive map showing connections between traders, brokers, and market makers
- **Audit Trail Browser:** Searchable, filterable view of all historical platform activities

## The Widget: Platform's Core Innovation & Design System Source of Truth

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

## Design System Consistency Mandate

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

## Accessibility: WCAG AA

The platform will meet WCAG AA standards for professional use, including:
- High contrast mode for extended screen viewing
- Clear focus indicators and error messaging
- Consistent navigation patterns across all screens
- Screen reader compatibility for compliance features

## Branding

Professional financial platform aesthetic with:
- Dark theme (#0F1419 background) optimized for all-day trading screen viewing
- SF Pro font stack with clear size distinctions for rapid scanning
- Typography hierarchy enabling quick information processing
- Tailwind CSS custom color palette (50-900 shades) for consistent design system
- Clean, data-dense layouts maximizing information per screen
- Lucide React icons for universal recognition
- Mobile-responsive drawer with collapsible navigation for space efficiency
- White-label ready architecture for client customization

## Target Device and Platforms: Desktop Browser Only

- **Primary:** Desktop browsers on trading workstations (1920x1080 minimum resolution)
- **Browsers:** Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **No Mobile Support:** Platform is explicitly desktop-only for professional trading environments
- **Multi-Monitor:** Support for traders using multiple screens with detachable widgets (Phase 2)
