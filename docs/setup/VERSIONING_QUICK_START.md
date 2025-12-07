# Cloud Run Versioning - Quick Start

## TL;DR

**Yes, Cloud Run has versioning!** It's called **revisions**, and it's just as powerful as App Engine versions.

## 3 Ways to Deploy

### 1. Standard (Original)
```bash
./scripts/deploy.sh
```
- Immediate 100% traffic to new version
- Use for: minor updates, bug fixes

### 2. Test First (Recommended)
```bash
# Deploy without traffic
./scripts/deploy-staged.sh --no-traffic

# Test at: https://test---lao-cinema-web-xxx.run.app

# Release when ready
gcloud run services update-traffic lao-cinema-web \
  --region=asia-southeast1 \
  --to-latest
```
- Test before releasing
- Use for: major features, risky changes

### 3. Gradual Rollout
```bash
# Start with 10%
./scripts/deploy-staged.sh --canary 10

# Monitor, then increase
./scripts/deploy-staged.sh --canary 50

# Full release
./scripts/deploy-staged.sh
```
- Gradual traffic migration
- Use for: high-risk updates, performance changes

## Emergency Rollback

```bash
./scripts/deploy-staged.sh --rollback
```

Instantly reverts to previous version!

## Key Differences: Cloud Run vs App Engine

| Feature | App Engine | Cloud Run |
|---------|-----------|-----------|
| Versioning | ✅ Versions | ✅ Revisions |
| Test URLs | ✅ Yes | ✅ Yes (with tags) |
| Traffic Split | ✅ Yes | ✅ Yes |
| Rollback | ✅ Yes | ✅ Yes |
| Auto-scale | ✅ Yes | ✅ Yes + Scale to Zero |

**Bottom line:** Cloud Run has all the version management features you need, plus it's faster and cheaper!

## What Changed?

**Before (your current deploy.sh):**
- Always 100% traffic to new version immediately
- No way to test before releasing
- Manual rollback required

**After (new deploy-staged.sh):**
- Deploy without traffic (`--no-traffic`)
- Canary releases (`--canary 10`)
- One-command rollback (`--rollback`)
- Tagged test URLs

## Next Steps

1. **Keep using `deploy.sh` for minor updates** - it works great!

2. **Use `deploy-staged.sh` for major changes:**
   ```bash
   # Test deployment
   ./scripts/deploy-staged.sh --no-traffic
   
   # Canary deployment
   ./scripts/deploy-staged.sh --canary 10
   
   # Rollback
   ./scripts/deploy-staged.sh --rollback
   ```

3. **Read full docs:**
   - [CLOUD_RUN_VERSIONING.md](./CLOUD_RUN_VERSIONING.md) - Complete guide
   - [DEPLOYMENT_WORKFLOWS.md](../../DEPLOYMENT_WORKFLOWS.md) - Workflow examples

## FAQ

**Q: Do I need to change anything in my code?**  
A: No! This is just deployment configuration.

**Q: Will this cost more?**  
A: No! Cloud Run only charges for active revisions receiving traffic.

**Q: How many revisions are kept?**  
A: Cloud Run automatically keeps the last 1000 revisions.

**Q: Can I rollback to any old revision?**  
A: Yes! List revisions with `gcloud run revisions list` and switch traffic to any of them.

**Q: What happens to the old deploy.sh?**  
A: Keep it! Use it for standard deployments. New script is optional.

## Real-World Example

**Scenario:** You're deploying a major video player update.

```bash
# 1. Deploy without affecting users
./scripts/deploy-staged.sh --no-traffic

# 2. Test the new player
# Visit: https://test---lao-cinema-web-xxx.run.app
# Play several videos, check all features

# 3. Start gradual rollout
./scripts/deploy-staged.sh --canary 10

# 4. Monitor logs for 15 minutes
gcloud run services logs tail lao-cinema-web --region=asia-southeast1

# 5. If all good, increase traffic
./scripts/deploy-staged.sh --canary 50

# 6. Monitor again, then full release
./scripts/deploy-staged.sh

# If any issues at any step:
./scripts/deploy-staged.sh --rollback
```

**Result:** Zero downtime, safe deployment, instant rollback capability!

---

**Ready to try it?** Start with a test deployment:

```bash
./scripts/deploy-staged.sh --no-traffic --help
```
