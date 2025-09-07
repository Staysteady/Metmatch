# Data Model & Schema Specification

## Core Entities and Relationships

The Met Match platform uses a normalized relational database structure optimized for trading workflows and compliance requirements.

### Users & Authentication
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

### RFQ System
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

### Orders & Trades
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

### Market Broadcasting
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

### Network & Connections
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

### Compliance & Audit
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

## Performance Indexes
```sql
CREATE INDEX idx_rfqs_creator_status ON rfqs(creator_id, status);
CREATE INDEX idx_rfqs_expiry ON rfqs(expiry_time);
CREATE INDEX idx_orders_trader_broker ON orders(trader_id, broker_id);
CREATE INDEX idx_audit_logs_user_timestamp ON audit_logs(user_id, timestamp);
CREATE INDEX idx_connections_users ON connections(requester_id, target_id);
```
