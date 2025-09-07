# Requirements

## Functional

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

## Non-Functional

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
