# Epic 3: Core Trading Interface & Real-time Infrastructure

Build the main trading dashboard with real-time capabilities and the signature trading widget.

## Story 3.1: WebSocket Infrastructure

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

## Story 3.2: Main Activity Table

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

## Story 3.3: MarketBroadcastWidget Development

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

## Story 3.4: User Status & Presence

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
