# Monitoring & Observability

## Key Metrics

### Business Metrics
- Active users (DAU/MAU)
- RFQs created per hour
- RFQ response rate
- Average time to quote
- Trade completion rate
- User session duration

### Technical Metrics
- API response times (P50, P95, P99)
- WebSocket connection count
- Message delivery latency
- Database query performance
- Error rates by endpoint
- CPU/Memory utilization

### User Experience
- Page load times
- JavaScript error rate
- Failed API calls
- WebSocket reconnection rate
- Session crash rate

## Alerting Thresholds

### Critical (Page immediately)
- API error rate >5%
- Database connection pool exhausted
- WebSocket server down
- Authentication service failure
- Trade confirmation failure rate >1%

### High (Notify on-call)
- API P99 latency >500ms
- WebSocket connections >80% capacity
- Disk usage >80%
- Memory usage >85%
- Failed login attempts >100/minute

### Medium (Notify team)
- RFQ response rate <50%
- User session errors >2%
- Slow database queries >1s
- Background job failures >5%

## Logging Strategy

### Log Levels
- ERROR: System errors, failed operations
- WARN: Deprecated usage, performance issues
- INFO: User actions, business events
- DEBUG: Detailed execution flow (dev only)

### Structured Logging
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

### Log Retention
- Application Logs: 30 days
- Audit Logs: 7 years
- Performance Logs: 90 days
- Debug Logs: 7 days
