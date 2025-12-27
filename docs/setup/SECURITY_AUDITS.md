# Security Audits

## Overview

Lao Cinema implements automated security auditing for all dependencies across the monorepo. This ensures vulnerabilities are detected and addressed promptly.

## Components

### 1. Manual Audit Script

**Location:** `/scripts/security-audit.sh`

Runs `npm audit` across all workspaces (API, Web, Database, Video Server) and reports vulnerabilities.

**Usage:**
```bash
# From project root
./scripts/security-audit.sh

# Or via npm
npm run security:audit
```

**Exit Codes:**
- `0` - No vulnerabilities detected
- `1` - Vulnerabilities found (blocks deployment)

**Output:**
```
🔒 Lao Cinema Security Audit
==============================

📦 Auditing: API
----------------------------------------
✓ No vulnerabilities found

📦 Auditing: Web
----------------------------------------
✗ Vulnerabilities detected
  2 moderate severity vulnerabilities

Run 'npm audit fix' to automatically fix issues
Run 'npm audit fix --force' for breaking changes

==============================
✗ Security audit failed
```

### 2. GitHub Actions Workflow

**Location:** `/.github/workflows/security-audit.yml`

**Triggers:**
- **Push to main** - Catches vulnerabilities before deployment
- **Pull requests** - Prevents vulnerable code from merging
- **Weekly schedule** - Monday 9am UTC (catches new CVEs)
- **Manual trigger** - Run on-demand via GitHub UI

**Severity Threshold:** Moderate and above

**Features:**
- Parallel auditing of all workspaces
- Artifact upload of audit results on failure
- Dependency Review for pull requests
- Fails CI if vulnerabilities detected

## Severity Levels

NPM audit uses the following severity classifications:

| Severity | Description | Action Required |
|----------|-------------|-----------------|
| **Critical** | Exploitable, causes major damage | Fix immediately |
| **High** | Exploitable, significant impact | Fix within 24 hours |
| **Moderate** | Limited exploitability or impact | Fix within 1 week |
| **Low** | Minimal risk | Fix when convenient |
| **Info** | No security risk | Optional |

**Our threshold:** Moderate and above (blocks deployment)

## Fixing Vulnerabilities

### Automatic Fixes

Most vulnerabilities can be fixed automatically:

```bash
# Fix vulnerabilities without breaking changes
npm audit fix

# Fix all vulnerabilities (may introduce breaking changes)
npm audit fix --force
```

**Run in each workspace:**
```bash
cd api && npm audit fix
cd ../web && npm audit fix
cd ../db && npm audit fix
cd ../video-server && npm audit fix
```

### Manual Review

For vulnerabilities that can't be auto-fixed:

1. **Review the vulnerability:**
   ```bash
   npm audit
   ```

2. **Check for updates:**
   ```bash
   npm outdated
   npm update <package-name>
   ```

3. **Update major versions manually:**
   ```bash
   npm install <package-name>@latest
   ```

4. **If no fix available:**
   - Check if the vulnerable code path is used
   - Add to exceptions if risk is acceptable (document why)
   - Consider alternative packages
   - Report to package maintainers

### Overriding Vulnerabilities

If a vulnerability cannot be fixed or is a false positive:

**Create audit override:**
```bash
# Generate audit report
npm audit --json > audit-report.json

# Create .npmrc override (use sparingly)
echo "audit-level=high" >> .npmrc
```

**Document in code:**
```markdown
## Known Security Exceptions

### package-name@version
- **CVE:** CVE-2024-XXXXX
- **Severity:** Moderate
- **Status:** No fix available
- **Mitigation:** We don't use the vulnerable code path
- **Review Date:** 2024-12-28
- **Next Review:** 2025-01-28
```

## Integration with CI/CD

### Pre-deployment Check

Security audits run automatically before deployment:

```bash
# In deployment script
./scripts/security-audit.sh
if [ $? -ne 0 ]; then
  echo "❌ Security audit failed - deployment blocked"
  exit 1
fi
```

### Pull Request Checks

GitHub Actions prevents merging PRs with vulnerabilities:

1. PR created → Security audit runs
2. Vulnerabilities found → PR checks fail
3. Developer fixes issues → PR checks pass
4. PR can be merged

## Monitoring & Alerts

### GitHub Security Alerts

**Dependabot** automatically:
- Monitors dependencies
- Creates PRs for security updates
- Sends email notifications

**Enable in GitHub:**
1. Repository → Settings → Security & Analysis
2. Enable "Dependabot alerts"
3. Enable "Dependabot security updates"

### Weekly Reports

The scheduled workflow runs every Monday:
- Reviews all dependencies
- Catches newly disclosed CVEs
- Creates GitHub Issues for findings (can be configured)

## Best Practices

### 1. Regular Updates

Update dependencies regularly, not just when vulnerabilities found:

```bash
# Monthly maintenance
npm outdated
npm update
npm test
```

### 2. Lock File Integrity

Commit `package-lock.json` to ensure reproducible builds:
- Never manually edit lock files
- Regenerate with `npm install` after changes
- Verify integrity: `npm ci` (fails if lock file doesn't match)

### 3. Minimize Dependencies

Fewer dependencies = smaller attack surface:
- Evaluate necessity before adding packages
- Use native alternatives when possible
- Prefer well-maintained packages with active communities
- Review bundle size and dependency tree

### 4. Audit Before Deployment

Always run security audit before deploying:
```bash
# In deployment workflow
npm run security:audit || exit 1
```

### 5. Keep Node.js Updated

Update Node.js runtime regularly:
- Use LTS (Long Term Support) versions
- Update within LTS track (e.g., 20.x → 20.y)
- Test thoroughly before major version upgrades

Current requirement: **Node.js 20.9.0+**

## Troubleshooting

### "npm audit fix" doesn't fix everything

**Cause:** Breaking changes required or transitive dependencies

**Solutions:**
1. Check if major version update available
2. Update parent packages that depend on vulnerable package
3. Wait for upstream fix
4. Find alternative package

### Audit fails in CI but passes locally

**Cause:** Different `npm audit` database versions

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### False Positives

**Cause:** Vulnerability in unused code paths

**Solutions:**
1. Verify your code doesn't use vulnerable functionality
2. Document exception with justification
3. Contact package maintainers to fix or clarify
4. Consider adding `.npmrc` override with documentation

### Transitive Dependency Vulnerabilities

**Cause:** Dependency of a dependency has vulnerability

**Solutions:**
```bash
# Force resolution to fixed version
npm install --save-exact <vulnerable-package>@<fixed-version>

# Or use overrides in package.json
{
  "overrides": {
    "vulnerable-package": "^fixed-version"
  }
}
```

## Emergency Response

If critical vulnerability discovered in production:

### 1. Assess Impact (10 min)
- Is the vulnerability exploitable in our codebase?
- What data/systems are at risk?
- Are we actively being exploited?

### 2. Immediate Mitigation (30 min)
- Apply hotfix if available: `npm update <package>`
- Deploy emergency patch
- Consider temporary service shutdown if actively exploited

### 3. Communication (concurrent)
- Notify team via Slack/email
- Document incident in audit log
- Prepare user communication if data breach

### 4. Post-Incident Review (24 hours)
- Root cause analysis
- Update security procedures
- Review monitoring/alerting
- Update documentation

## Related Documentation

- `/docs/features/AUTH_SECURITY.md` - Authentication security
- `/docs/features/VIDEO_SECURITY.md` - Video access security
- `/scripts/deploy.sh` - Deployment with security checks

## Package-Specific Notes

### API Dependencies

**Critical packages to monitor:**
- `fastify` - Web framework
- `drizzle-orm` - Database ORM
- `pg` - PostgreSQL driver
- `@fastify/cors` - CORS handling
- `bcrypt` or `scrypt` - Password hashing

### Web Dependencies

**Critical packages to monitor:**
- `next` - Framework
- `react` / `react-dom` - UI library
- `hls.js` - Video streaming
- Any authentication/session libraries

### Database Dependencies

**Critical packages to monitor:**
- `drizzle-kit` - Schema migrations
- `pg` - PostgreSQL client

## Automation Roadmap

- [x] Manual audit script
- [x] GitHub Actions workflow
- [x] Weekly scheduled scans
- [ ] Slack/email notifications for new vulnerabilities
- [ ] Automatic PR creation for security updates (Dependabot)
- [ ] Security dashboard with historical trends
- [ ] Integration with Snyk or similar security platform
