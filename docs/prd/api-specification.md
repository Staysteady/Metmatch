# API Specification

## Authentication Endpoints

### POST /api/auth/register
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

### POST /api/auth/login
```json
Request:
  email: string
  password: string

Response:
  user: User
  access_token: string
  refresh_token: string
```

### POST /api/auth/refresh
```json
Request:
  refresh_token: string

Response:
  access_token: string
  refresh_token: string
```

## RFQ Endpoints

### POST /api/rfqs
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

### GET /api/rfqs
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

### POST /api/rfqs/:id/respond
```json
Request:
  price: number
  quantity: number
  validity_minutes: number
  counter_offer: boolean

Response:
  response: RFQResponse
```

## Order Management Endpoints

### GET /api/orders
```json
Query:
  status?: DRAFT | SUBMITTED | WORKING | FILLED | CANCELLED
  page: number
  limit: number

Response:
  orders: Order[]
  total: number
```

### POST /api/orders/:id/confirm
```json
Response:
  trade: Trade
  confirmation_sent: boolean
```

## Market Broadcast Endpoints

### POST /api/markets/broadcast
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

## WebSocket Events

### Client → Server Events
- `authenticate`: Token authentication
- `subscribe`: Channel subscription
- `rfq-create`: Create new RFQ
- `rfq-respond`: Respond to RFQ
- `order-update`: Update order status
- `set-status`: Update user status

### Server → Client Events
- `rfq-received`: New RFQ notification
- `rfq-response-received`: RFQ response notification
- `order-status-changed`: Order status update
- `market-broadcast-new`: New market broadcast
- `user-status-changed`: User status change
- `connection-request`: New connection request
