# Pre-Alpha Readiness - Partner Demo

**Purpose**: Demonstrable platform for content partners with limited friend-of-friend testing

**Target Audience**: Content partners and their invited testers (20-100 users max)

**Last Updated**: December 16, 2025

---

## Executive Summary

| Category | Status | Notes |
|----------|--------|-------|
| **Core Streaming** | ✅ Ready | HLS player, GCS hosting, adaptive bitrate working |
| **Content Protection** | ✅ Ready | Signed URLs, rental validation, time-limited tokens |
| **User Accounts** | ✅ Ready | Registration, login, anonymous support |
| **Content Management** | ✅ Ready | TMDB import, bilingual editing, admin panel |
| **Pre-Alpha Safeguards** | ⚠️ Needed | User cap, rental limits, stream limits |
| **Visual Polish** | ⚠️ Review | Homepage, detail pages, mobile experience |
| **Access Control** | ⚠️ Decide | Invite-only vs. public with HTTP Basic Auth |

---

## ✅ What's Already Complete

### Core Platform Features

#### Video Streaming
- **HLS playback** with adaptive bitrate (1080p/720p/480p/360p)
- **Google Cloud Storage** integration for production videos
- **Signed URLs** with 15-minute expiration + rental validation
- **Session cookies** for HLS segments (20-minute expiry)
- **Mobile-optimized player** with touch controls and fullscreen
- **Cross-device watch progress** sync

#### Content Protection
- **Rental enforcement** - Tokens only issued for active rentals
- **Time-limited access** - URLs expire automatically
- **Path validation** - Tokens grant access to specific movie only
- **User-bound tokens** - Cannot be shared between users
- **HMAC signatures** - Cryptographically secure, cannot be forged

#### User System
- **Anonymous viewing** - Full functionality without account
- **Email/password auth** - Registration and login
- **Session management** - 30-day sessions with secure tokens
- **Data migration** - Anonymous → authenticated on first login
- **User profiles** - Dashboard, settings, rentals, continue watching
- **Dual-mode APIs** - Support both userId and anonymousId

#### Content Management
- **TMDB integration** - Import movies with metadata, cast, crew
- **Bilingual support** - English/Lao with URL-based routing (`/en/*`, `/lo/*`)
- **Admin panel** - Import, edit, people management, analytics
- **Production companies** - Full CRUD with TMDB sync
- **Trailers** - YouTube + self-hosted support
- **Homepage management** - Featured movies with custom ordering
- **Audit logging** - Track all content changes

#### Rental System
- **Database-backed** rentals with expiration tracking
- **Anonymous support** - Rent without account
- **Short packs** - Bundle multiple movies
- **Cross-device sync** - Rentals work on all devices
- **Grace period** - Configurable expiration handling

### Infrastructure
- **GCP Cloud Run** deployment configured
- **PostgreSQL 16** database with 22 migrations
- **Docker Compose** for local development
- **HTTP Basic Auth** at deployment level (optional)
- **70+ unit tests** for critical paths

---

## ⚠️ Pre-Alpha Safeguards

### ✅ Implemented

#### Per-Movie Rental Cap
**Status**: Complete  
**Configuration**: `MAX_RENTALS_PER_MOVIE=20` (environment variable)

**Purpose**: Protect scarce content during testing by limiting total rentals per film

**Implementation**:
- Config file: `api/src/config.ts`
- Validation: `api/src/routes/rentals.ts`
- Frontend error handling with alpha testing messaging
- Set to 20 rentals per movie in production
- Set to 0 to disable

**How to change**:
```bash
# Update live without redeploying
gcloud run services update lao-cinema-api \
  --region=asia-southeast1 \
  --update-env-vars="MAX_RENTALS_PER_MOVIE=50"

# Or edit scripts/deploy.sh for next deployment
```

---

## 🔄 Optional Safeguards

### 1. Hard User Cap (20-100 users)

**Purpose**: Limit total registered users to control testing scope

**Implementation Options**:

#### Option A: Registration Gate (Recommended)
```typescript
// api/src/routes/auth.ts - In registration endpoint
const userCount = await db.select({ count: sql`count(*)` }).from(users);
const MAX_USERS = parseInt(process.env.MAX_USERS || '100');

if (userCount[0].count >= MAX_USERS) {
  return reply.status(403).send({
    error: 'Registration is currently limited to invited testers',
    code: 'MAX_USERS_REACHED'
  });
}
```

**Effort**: 30 minutes  
**File**: `api/src/routes/auth.ts`

#### Option B: Invite-Only System
- Admin generates invite codes
- Registration requires valid invite code
- Codes are single-use with expiration

**Effort**: 2-3 hours  
**Pros**: More controlled, better tracking  
**Cons**: More development time

### 2. Max Rentals Per User

**Status**: Optional (per-movie cap may be sufficient)

**Purpose**: Prevent abuse, ensure fair testing distribution

**Recommendation**: 10-20 rentals per user for testing phase

**Implementation**:
```typescript
// api/src/routes/rentals.ts - Before creating rental
const userRentals = await db
  .select({ count: sql`count(*)` })
  .from(rentals)
  .where(userId ? eq(rentals.userId, userId) : eq(rentals.anonymousId, anonymousId));

const MAX_RENTALS_PER_USER = parseInt(process.env.MAX_RENTALS_PER_USER || '20');

if (userRentals[0].count >= MAX_RENTALS_PER_USER) {
  return reply.status(403).send({
    error: 'You have reached the maximum number of rentals for testing',
    code: 'MAX_RENTALS_REACHED'
  });
}
```

**Effort**: 30 minutes  
**File**: `api/src/routes/rentals.ts`

**Note**: With per-movie cap at 20, and 10+ movies, users can still rent 200+ times total. Consider this only if abuse becomes an issue.

### 3. Max Concurrent Streams

**Purpose**: Prevent account sharing, protect content

**Recommendation**: 1-2 concurrent streams per user

**Implementation**:

#### Approach: Active Session Tracking
```typescript
// New table in db/src/schema.ts
export const activeStreams = pgTable('active_streams', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  anonymousId: varchar('anonymous_id', { length: 255 }),
  movieId: uuid('movie_id').references(() => movies.id).notNull(),
  sessionId: varchar('session_id', { length: 255 }).notNull().unique(),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  lastHeartbeat: timestamp('last_heartbeat').defaultNow().notNull(),
});

// Before issuing video token
const activeCount = await db
  .select({ count: sql`count(*)` })
  .from(activeStreams)
  .where(
    and(
      userId ? eq(activeStreams.userId, userId) : eq(activeStreams.anonymousId, anonymousId),
      gte(activeStreams.lastHeartbeat, sql`now() - interval '5 minutes'`)
    )
  );

const MAX_CONCURRENT_STREAMS = parseInt(process.env.MAX_CONCURRENT_STREAMS || '2');

if (activeCount[0].count >= MAX_CONCURRENT_STREAMS) {
  return reply.status(403).send({
    error: 'Maximum concurrent streams reached. Please stop other videos first.',
    code: 'MAX_STREAMS_REACHED'
  });
}

// Create stream session
await db.insert(activeStreams).values({
  userId,
  anonymousId,
  movieId,
  sessionId: generateSessionId(),
});
```

**Frontend**: Send heartbeat every 2-3 minutes while playing  
**Cleanup**: Auto-expire sessions older than 5 minutes without heartbeat

**Effort**: 2-3 hours  
**Files**: `db/src/schema.ts`, `api/src/routes/video-tokens.ts`, `web/components/video-player.tsx`

---

## 🎨 Visual Polish - Review Needed

### Critical for Partner Demo

1. **Homepage First Impression**
   - [ ] Featured movies display attractively
   - [ ] Professional layout and typography
   - [ ] Loading states smooth
   - [ ] No broken images or layout issues

2. **Movie Detail Pages**
   - [ ] High-quality poster/backdrop display
   - [ ] Cast/crew photos display correctly
   - [ ] Rental flow is clear and intuitive
   - [ ] Bilingual content displays properly

3. **Video Player**
   - [ ] Controls are intuitive
   - [ ] Quality selector works
   - [ ] Fullscreen mode works on mobile
   - [ ] No buffering issues with test videos

4. **Mobile Experience**
   - [ ] Responsive design works (test on actual phones)
   - [ ] Touch controls are responsive
   - [ ] Text is readable on small screens
   - [ ] Navigation is smooth

### Current Status
- Homepage and movie pages exist and function
- Video player is mobile-optimized
- Responsive design implemented with Tailwind

**Action**: Manual testing needed on various devices

---

## 🔐 Access Control Strategy

### Option A: HTTP Basic Auth (Current)

**Pros**:
- ✅ Already implemented at deployment level
- ✅ Simple to share (username + password)
- ✅ Works for all users

**Cons**:
- ❌ Same credentials for everyone
- ❌ Cannot track who shared access
- ❌ No per-user control

**Good for**: Very limited testing (5-10 partners)

### Option B: Public Registration with User Cap

**Pros**:
- ✅ Partners can share link directly
- ✅ Track individual users
- ✅ Easy onboarding

**Cons**:
- ❌ Need user cap implementation
- ❌ Less controlled

**Good for**: 20-100 testers

### Option C: Invite-Only Registration

**Pros**:
- ✅ Full control over who registers
- ✅ Track invite usage
- ✅ Professional appearance

**Cons**:
- ❌ More development time (2-3 hours)
- ❌ Admin must generate codes

**Good for**: Controlled partner testing

### Recommendation

**Start with Option B** (public + user cap) for speed:
1. Keep HTTP Basic Auth at deployment level (prevents random discovery)
2. Add hard user cap to registration (30 min implementation)
3. Partners share: URL + Basic Auth credentials + "First 100 users only"

**Upgrade to Option C** if you need tighter control later.

---

## 🐛 Reliability Check

### Known Issues

1. **Video Letterboxing** - Some videos have baked-in black bars (encoding issue, not platform bug)
2. **No rate limiting** - Token generation and API calls are unlimited
3. **No error monitoring** - No Sentry or similar for production errors

### Pre-Launch Testing Checklist

- [ ] Deploy to production environment
- [ ] Upload 2-3 test movies with videos
- [ ] Test full user journey: Register → Browse → Rent → Watch
- [ ] Test on mobile (iOS + Android)
- [ ] Test bilingual content (EN + LO)
- [ ] Verify signed URLs work in production
- [ ] Test anonymous → authenticated migration
- [ ] Verify rental expiration works
- [ ] Check watch progress syncs across devices
- [ ] Monitor server logs for errors during testing

---

## 📋 Pre-Alpha Readiness Checklist

### Critical (Must Have)

- [x] **Per-movie rental cap** - Implemented (20 rentals per film)
- [ ] **Production deployment tested** - Verify everything works live
- [ ] **Content uploaded** - At least 5-10 movies with videos and Lao translations
- [ ] **Mobile testing** - Verify on actual devices
- [ ] **Access control decision** - Choose Basic Auth + cap vs. invite codes
- [ ] **Partner onboarding doc** - How to share, what to expect

### High Priority (Strongly Recommended)

- [ ] **User cap** (30 min, optional) - Limit registered accounts if needed
- [ ] **Per-user rental limit** (30 min, optional) - Only if abuse becomes issue
- [ ] **Concurrent stream limit** (2-3 hours) - Prevent account sharing
- [ ] **Error monitoring** - Set up basic logging/alerting
- [ ] **Backup strategy** - Database backup configured
- [ ] **Rate limiting** - Basic rate limits on auth and token endpoints
- [ ] **Analytics check** - Verify watch tracking works
- [ ] **Homepage curation** - Feature best content first

### Nice to Have (Can Defer)

- [ ] Welcome email for new users
- [ ] Feedback form for testers
- [ ] Admin dashboard for monitoring users/rentals
- [ ] Automated email for rental expiration
- [ ] Social preview images (Open Graph)

---

## 🚀 Implementation Priority

### Week 1: Critical Safeguards (1-2 days development)

1. **User cap** (30 min)
2. **Rental limit** (30 min)
3. **Concurrent streams** (2-3 hours)
4. **Production deployment test** (2-3 hours)

### Week 2: Content & Polish (Depends on content availability)

1. **Upload movies** with video sources
2. **Add Lao translations** for all content
3. **Curate homepage** with featured movies
4. **Mobile testing** on real devices

### Week 3: Launch Prep

1. **Create partner onboarding doc**
2. **Set up basic monitoring**
3. **Final testing sweep**
4. **Go live with partners**

---

## 💰 Cost Considerations

### Current Monthly Costs (Estimated)

- **GCP Cloud Run** (web + api): ~$20-50/month (with free tier)
- **Cloud SQL** (PostgreSQL): ~$10-20/month (shared-core)
- **Google Cloud Storage**: ~$1-5/month (for 5-10 movies)
- **Total**: ~$30-75/month for pre-alpha

### With 50-100 Active Users

- **Video bandwidth**: ~$10-30/month (depends on watch time)
- **Database**: May need upgrade to ~$50-100/month
- **Total**: ~$90-160/month

**Note**: These are rough estimates. Monitor actual usage closely.

---

## 📧 Partner Communication Template

### What to Tell Partners

**Subject**: Lao Cinema Platform - Testing Invitation

**Body**:
> We're launching a private testing phase for Lao Cinema, our bilingual streaming platform for Lao films.
>
> **Access**: [URL] (use provided username/password)
>
> **What's working**:
> - Browse movies in English or Lao (ລາວ)
> - Create account (or browse anonymously)
> - Rent movies (testing phase - no payments)
> - Stream with adaptive quality (up to 1080p)
> - Watch on mobile or desktop
> - Resume playback across devices
>
> **Limitations**:
> - Testing phase: First 100 users only
> - Max 20 movie rentals per user
> - Max 2 concurrent streams
> - Limited catalog (expanding)
>
> **How to test**:
> 1. Create an account or browse as guest
> 2. Rent any movie (free during testing)
> 3. Watch and provide feedback
> 4. Share with 2-3 friends for additional testing
>
> **Feedback**: [Contact email or form]
>
> Thank you for being an early tester!

---

## 🎯 Success Criteria

### Pre-Alpha is Ready When:

- [x] Core streaming works reliably
- [x] Content protection is in place
- [ ] User safeguards implemented (cap, limits, streams)
- [ ] 5-10 movies uploaded with videos
- [ ] Tested on production environment
- [ ] Tested on mobile devices (iOS + Android)
- [ ] Partners can successfully onboard friends
- [ ] No critical bugs in user flow
- [ ] Bilingual content displays correctly

### Red Flags (Do Not Launch)

- ❌ Videos won't play in production
- ❌ Signed URLs not working
- ❌ Mobile experience broken
- ❌ Database errors during testing
- ❌ No user cap (uncontrolled growth risk)
- ❌ Critical security issues

---

## 📞 Support Plan

### During Pre-Alpha Testing

**Expected Issues**:
1. Email deliverability (Brevo configuration required)
2. Confusion about rental vs. ownership
3. Browser compatibility issues
4. Mobile-specific playback issues

**Mitigation**:
- Configure Brevo API key in production environment
- Clear messaging: "Rent for 48 hours"
- Test on Chrome, Safari, Firefox, mobile browsers
- Provide troubleshooting guide to partners

**Communication Channel**: Decide on email/Discord/Slack for partner feedback

---

## 📚 Related Documentation

- `docs/STATUS.md` - Overall project status
- `docs/architecture/STACK.md` - Complete technology stack
- `docs/features/VIDEO_SECURITY.md` - Video protection details
- `docs/architecture/VIDEO_ARCHITECTURE.md` - Video delivery architecture
- `AGENTS.md` - Development guidelines

---

**Next Action**: Review this document, decide on safeguards timeline, and prioritize implementation.
