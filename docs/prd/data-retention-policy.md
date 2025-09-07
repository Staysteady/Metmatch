# Data Retention Policy

## Active Data Management

### PostgreSQL (Primary Database)
- Active Trading Data: 1 year in primary tables
- User Profiles: Retained while account active
- RFQs: 90 days in active tables, then archived
- Orders/Trades: 1 year active, then archived

### Archive Strategy
- Monthly archival job moves old data to archive tables
- Archive tables use partitioning by month
- Archived data queryable but with slower performance
- After 7 years, data exported to cold storage

### Redis (Cache/Session)
- Sessions: 24 hours TTL
- Cache: Variable TTL based on data type
- Telemetry Buffer: Flushed every 5 minutes

## GDPR Compliance

### Data Subject Rights
- Access: Export all user data within 72 hours
- Rectification: Edit profile data immediately
- Erasure: Delete PII within 30 days (except audit logs)
- Portability: Export in JSON/CSV format

### Data Minimization
- Collect only necessary trading data
- Automatic PII removal from logs
- Regular review of data collection practices

### Consent Management
- Explicit consent for data processing
- Granular consent options
- Consent withdrawal mechanism
- Consent audit trail

## Backup Retention

### Retention Periods
- Daily Backups: 7 days
- Weekly Backups: 4 weeks
- Monthly Backups: 12 months
- Annual Backups: 7 years

### Storage Tiers
- Hot (0-30 days): Instant access
- Warm (30-365 days): <4 hour retrieval
- Cold (1-7 years): <24 hour retrieval
- Archive (7+ years): 48 hour retrieval

---
