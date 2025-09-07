# Deployment & DevOps

## Deployment Strategy

### Environment Pipeline
- Development: Auto-deploy on commit to develop branch
- Staging: Auto-deploy on PR merge to main
- Production: Manual approval required

### Deployment Method
- Strategy: Blue-Green deployment
- Rollback Time: <2 minutes
- Health Checks: Required before traffic switch
- Canary Testing: 10% traffic for 30 minutes

### Database Migrations
- Tool: Drizzle ORM migrations
- Strategy: Forward-only migrations
- Rollback: Via compensating migrations
- Testing: Required on staging before production

## Infrastructure as Code

### Terraform Modules
- VPC and networking
- ECS/EKS cluster
- RDS PostgreSQL
- ElastiCache Redis
- ALB/NLB load balancers
- CloudWatch monitoring
- S3 for backups

### CI/CD Pipeline
1. Code commit triggers webhook
2. Run linting and type checking
3. Execute unit tests (must pass 80%)
4. Execute integration tests
5. Build Docker images
6. Push to registry
7. Deploy to environment
8. Run smoke tests
9. Notify team of result
