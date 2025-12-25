# Archived Documentation

This folder contains detailed technical documentation for completed bug fixes and migrations. These documents provide in-depth implementation details and are kept for reference.

All information from these files has been consolidated into the main [CHANGELOG.md](../changelog/CHANGELOG.md).

## Archived Files

**Bug Fixes (December 2025)**:
- `CAST_CREW_SYNC_FIX.md` - Details of the critical cast/crew data loss bug and fix
- `CROSS_DEVICE_WATCH_PROGRESS_FIX.md` - Cross-device watch progress sync implementation
- `MOBILE_FULLSCREEN_FIX.md` - Mobile video player fixes (fullscreen, touch, height)
- `WATCH_PROGRESS_FIX.md` - Watch progress migration to dual-write approach

**System Migrations (December 2025)**:
- `MIGRATION_SUMMARY.md` - Database-first rental system migration

**Refactoring Documentation (December 2025)**:
- `REFACTOR_ADMIN_EDIT_PAGE_PLAN.md` - Admin edit page refactoring plan
- `REFACTOR_ADMIN_EDIT_PAGE_PHASE1.md` - Phase 1 implementation details
- `REFACTOR_ADMIN_EDIT_TESTS.md` - Test improvements for admin edit
- `REFACTOR_AUTH_HEADERS_DUPLICATION.md` - Auth headers deduplication
- `REFACTOR_CAST_CREW_DUPLICATION.md` - Cast/crew code deduplication
- `REFACTOR_PERSON_CREDITS_QUERY.md` - Person credits query optimization

## Why Archived?

These files contain valuable technical details but were cluttering the root directory. The key information has been extracted and added to:
- `docs/changelog/CHANGELOG.md` - User-facing changelog with high-level changes
- `docs/setup/STORAGE_STRATEGY.md` - Current data storage approach
- `docs/features/USER_ACCOUNTS.md` - Authentication and user system documentation

## When to Reference These Files

Use these archived documents when you need:
- Deep technical details on specific bug fixes
- Step-by-step implementation walkthroughs
- Testing procedures for completed features
- Historical context on why certain decisions were made
