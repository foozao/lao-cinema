# Accepted Security Risks

This document tracks security vulnerabilities that have been evaluated and accepted (not fixed) with justification.

## Current Accepted Risks

### esbuild <=0.24.2 (Moderate Severity)

**CVE**: GHSA-67mh-4wv8-2f99  
**Advisory**: https://github.com/advisories/GHSA-67mh-4wv8-2f99  
**Affected packages**: `api`, `db` (via drizzle-kit)  
**Status**: Accepted (not fixing)  
**Date accepted**: December 30, 2025

#### Vulnerability Description
esbuild's development server can be exploited to send requests to arbitrary URLs and read responses, potentially exposing local network resources.

#### Why Accepted

1. **Development-only risk**
   - esbuild is only used via drizzle-kit for database migrations
   - Not present in production builds or runtime
   - No esbuild dev server is run

2. **Low exploitability**
   - Requires attacker access to same network as development machine
   - Requires developer to be running drizzle-kit commands
   - Not exploitable in production environment

3. **Breaking change to fix**
   - Fix requires upgrading drizzle-kit to 0.31.8
   - This is a major version jump that may break migrations
   - Risk of breaking database tooling outweighs dev-only vulnerability

4. **Temporary issue**
   - Waiting for drizzle-kit to update esbuild dependency
   - Will be resolved in future drizzle-kit release

#### Mitigation

- Developers should only run database migrations on trusted networks
- Do not run `drizzle-kit` commands on public/untrusted WiFi
- Monitor drizzle-kit releases for esbuild update

#### Review Date
Next review: March 2026 (or when drizzle-kit updates esbuild)

---

## Risk Assessment Criteria

Risks are evaluated based on:

1. **Exploitability**: How easy is it to exploit?
2. **Impact**: What damage could occur?
3. **Scope**: Production vs development only?
4. **Fix cost**: Breaking changes, development time, testing required
5. **Workarounds**: Can it be mitigated without fixing?

Risks are accepted when fix cost/complexity outweighs the actual risk in our specific context.
