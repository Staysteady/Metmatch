# Disaster Recovery & Business Continuity

## Backup Strategy

### Database Backups
- Frequency: Every 6 hours
- Retention: 30 days
- Type: Full backup + WAL archiving
- Test Restore: Weekly automated test

### Application State
- Redis: AOF persistence every second
- Sessions: Backed up to PostgreSQL
- File Uploads: S3 with versioning

### Audit Logs
- Real-time: Stream to S3
- Archive: Monthly to Glacier
- Retention: 7 years minimum

## Recovery Targets

### RTO (Recovery Time Objective)
- Critical Systems: 30 minutes
- Full Platform: 2 hours
- Historical Data: 24 hours

### RPO (Recovery Point Objective)
- Trades/Orders: 0 minutes (synchronous replication)
- User Data: 5 minutes
- Audit Logs: 1 minute
- Telemetry: 1 hour acceptable loss

## Incident Response

### Severity Levels
- SEV1: Platform down, data loss risk
- SEV2: Major feature unavailable
- SEV3: Minor feature degraded
- SEV4: Cosmetic issues

### Response Times
- SEV1: 15 minutes
- SEV2: 1 hour
- SEV3: 4 hours
- SEV4: Next business day

### Communication
- Status Page: status.metmatch.com
- Email Updates: Every 30 minutes during incident
- Post-Mortem: Within 48 hours for SEV1/SEV2
