# Security Specifications

## Authentication & Authorization

### JWT Configuration
- Algorithm: RS256
- Access Token TTL: 15 minutes
- Refresh Token TTL: 7 days
- Token Storage: httpOnly secure cookies + localStorage (backup)

### Password Policy
- Minimum Length: 8 characters
- Requirements: 1 uppercase, 1 lowercase, 1 number
- Bcrypt Rounds: 12
- Password History: Last 5 passwords cannot be reused

### Session Management
- Concurrent Sessions: Maximum 3 per user
- Idle Timeout: 30 minutes
- Absolute Timeout: 12 hours

## Rate Limiting

### Global Limits
- Default: 100 requests/minute per IP
- Authenticated: 200 requests/minute per user

### Endpoint-Specific
- `/api/auth/login`: 5 attempts/minute per IP
- `/api/auth/register`: 3 requests/hour per IP
- `/api/rfqs POST`: 30 requests/minute per user
- `/api/orders POST`: 50 requests/minute per user
- WebSocket messages: 100 messages/minute per connection

### Response Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1704626400
```

## Data Encryption

### In Transit
- Protocol: TLS 1.3 minimum
- Cipher Suites: ECDHE-RSA-AES256-GCM-SHA384 preferred
- HSTS: max-age=31536000; includeSubDomains

### At Rest
- Database: AES-256 encryption for sensitive fields
- Sensitive Fields: password_hash, personal_data, trade_details
- Key Management: AWS KMS or HashiCorp Vault
- Backup Encryption: AES-256 with separate key

### PII Handling
- Masking: Last 4 digits only for sensitive IDs
- Logging: No PII in logs except audit trail
- Export: Encrypted ZIP with password protection
