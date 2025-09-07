# Epic 4: RFQ System & Order Management

Implement the core trading workflows for request-for-quotes and order management.

## Story 4.1: Multi-directional RFQ Creation

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

## Story 4.2: RFQ Response & Negotiation

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

## Story 4.3: Order Management Workflow

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

## Story 4.4: Trade Confirmation System

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
