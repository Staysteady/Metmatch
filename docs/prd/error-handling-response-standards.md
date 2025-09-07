# Error Handling & Response Standards

## Standard Error Response Format
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

## Error Codes

### Authentication
- `AUTH_INVALID_CREDENTIALS`: Invalid email or password
- `AUTH_TOKEN_EXPIRED`: JWT token has expired
- `AUTH_TOKEN_INVALID`: Invalid or malformed token
- `AUTH_INSUFFICIENT_PERMISSIONS`: User lacks required permissions
- `AUTH_ACCOUNT_SUSPENDED`: Account has been suspended

### Validation
- `VALIDATION_ERROR`: General validation failure
- `VALIDATION_REQUIRED_FIELD`: Required field missing
- `VALIDATION_INVALID_FORMAT`: Invalid data format
- `VALIDATION_OUT_OF_RANGE`: Value outside acceptable range

### Business Logic
- `RFQ_EXPIRED`: RFQ has expired
- `RFQ_ALREADY_FILLED`: RFQ already filled
- `ORDER_CANNOT_MODIFY`: Order in non-modifiable state
- `INSUFFICIENT_RELATIONSHIP`: No verified connection exists
- `DUPLICATE_ENTRY`: Record already exists

### System
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `SERVICE_UNAVAILABLE`: Service temporarily unavailable
- `INTERNAL_ERROR`: Unexpected server error
- `WEBSOCKET_CONNECTION_FAILED`: Unable to establish WebSocket connection

## Retry Policies

### Retryable Operations
- Email sending: 3 attempts with exponential backoff (1s, 2s, 4s)
- Trade confirmations: 5 attempts over 30 minutes
- WebSocket reconnection: Infinite with exponential backoff (max 30s)
- External API calls: 3 attempts with 1s delay

### Non-Retryable
- Authentication failures
- Validation errors
- Business logic violations
- Explicit user cancellations
