# Analytics System

This document describes Lao Cinema's analytics architecture, including both homegrown analytics and Google Analytics integration.

## Overview

Lao Cinema uses a dual analytics approach:
- **Homegrown Analytics** - Backend database tracking for rentals, watch progress, and engagement metrics
- **Google Analytics** - Third-party analytics for site traffic, user behavior, and marketing insights

## System Architecture

### Backend Analytics (Database-Driven)

**Tables:**
- `rentals` - Rental transactions and active rental periods
- `watch_progress` - Video playback progress and completion tracking
- `video_analytics_events` - Granular video interaction events (start, pause, progress, complete)

**API Endpoints:**
```
GET /api/analytics/summary          # Platform-wide summary stats
GET /api/analytics/movies           # All movies with rental/watch data
GET /api/analytics/movies/:movieId  # Single movie detailed analytics
```

**What We Track:**
- Rental transactions (start date, expiry, price, user/anonymous ID)
- Watch sessions (duration, completion rate, device type, source)
- Video events (play, pause, seek, quality changes, completion)
- User engagement (unique viewers, repeat viewers, watch time distribution)

## Platform Analytics (Site-Wide)

### Admin Dashboard (`/admin/analytics`)

**Summary Metrics:**
- Total platform revenue
- Active rentals (current moment)
- Total movies with analytics
- Platform-wide watch time
- Average completion rate
- Unique viewers (7-day, 30-day, all-time)

**Movie Rankings:**
- Top movies by revenue
- Top movies by watch time
- Top movies by completion rate
- Top movies by unique viewers

**Recent Activity:**
- Latest rentals (last 10 transactions)
- Recent video events
- New user registrations

### Implementation Status
- ✅ Backend API endpoints (`api/src/routes/analytics.ts`)
- ✅ Frontend API client (`web/lib/api/analytics-client.ts`)
- ✅ Admin dashboard page (`web/app/[locale]/admin/analytics/page.tsx`)
- ⏳ Per-movie detail view (`web/app/[locale]/admin/analytics/[movieId]/page.tsx`) - In progress

## Content Provider Analytics (Per-Film)

### Per-Movie Analytics Page (`/admin/analytics/:movieId`)

**Rental Statistics:**
- Total rentals (all-time)
- Active rentals (current moment)
- Total revenue (from this film)
- Unique renters (distinct users who rented)
- Last rental date
- Revenue trend (daily/weekly/monthly)

**Watch Statistics:**
- Total views (rental video plays)
- Average watch time per session
- Completion rate (% who watched >90%)
- Engagement curve (where viewers drop off)
- Rewatch rate (users watching multiple times)

**Engagement Metrics:**
- Trailer views
- Detail page visits
- Add-to-watchlist count
- Share button clicks

**Recent Rentals:**
- List of last 10-20 rental transactions
- Rental status (active/expired)
- Expiry countdown for active rentals
- User demographics (if available)

**Viewer Demographics:**
- Geographic distribution (if location data available)
- Language preference (en/lo split)
- Device breakdown (desktop/mobile/tablet)
- Browser distribution

### Future: Content Provider Portal

Long-term plan for dedicated content provider dashboards:
- Studio/distributor-specific login
- Multi-film analytics (for studios with multiple titles)
- Downloadable reports (CSV, PDF)
- Email digest of performance metrics
- Comparative analytics (vs. genre average, platform average)
- Revenue forecasting based on trends

**Not Implemented Yet:**
- Aggregate analytics by studio
- External content provider portals
- Automated email reports
- Export to CSV/PDF

## Google Analytics Integration

### What Google Analytics Tracks

**Site Traffic:**
- Page views (all pages)
- Session duration
- Bounce rate
- Traffic sources (direct, referral, search, social)
- Geographic distribution
- Device/browser breakdown

**User Behavior:**
- Navigation paths (entry → browse → watch → exit)
- Search queries (internal site search)
- Click tracking (buttons, links, CTAs)
- Scroll depth
- Time on page

**Marketing & Acquisition:**
- Campaign tracking (UTM parameters)
- Conversion funnels (browse → rent → watch)
- Goal completions (rental, account creation, watch completion)
- Referral sources
- Social media traffic

**E-commerce Tracking:**
- Rental transactions (revenue, product ID, quantity)
- Add to cart (watchlist additions)
- Checkout abandonment
- Revenue attribution by source

### Implementation

**Setup:**
```env
# web/.env
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

**Integration Points:**
- Next.js `_app.tsx` - Global GA initialization
- Page transitions - Automatic page view tracking
- Rental events - Transaction tracking with revenue
- Video player - Custom events (play, pause, complete)
- Account actions - Goal completions (register, login)

**Custom Events:**
```typescript
// Rental completed
gtag('event', 'purchase', {
  transaction_id: rentalId,
  value: price,
  currency: 'USD',
  items: [{
    item_id: movieId,
    item_name: movieTitle,
    item_category: 'Movie Rental',
    price: price,
    quantity: 1
  }]
});

// Video completion
gtag('event', 'video_complete', {
  video_title: movieTitle,
  video_duration: duration,
  completion_rate: 0.95
});
```

### Privacy Compliance

**GDPR & User Consent:**
- Cookie consent banner before GA loads
- Opt-out mechanism for tracking
- Anonymize IP addresses (`anonymize_ip: true`)
- Respect Do Not Track (DNT) browser setting

**Data Retention:**
- GA: 14 months (configurable)
- Homegrown: Indefinite (for business analytics)

## Homegrown vs. Google Analytics

### Division of Responsibility

| Metric | Homegrown | Google Analytics |
|--------|-----------|------------------|
| Rental revenue | ✅ Primary | ✅ Secondary (e-commerce) |
| Watch time/completion | ✅ Primary | ✅ Secondary (custom events) |
| Active rentals | ✅ Only | ❌ Not tracked |
| Page views | ❌ Not tracked | ✅ Only |
| Traffic sources | ❌ Not tracked | ✅ Only |
| User demographics | ⏳ Partial (registered users) | ✅ Full (IP-based) |
| Device/browser | ✅ Basic (user agent) | ✅ Detailed |
| Geographic data | ⏳ Future (IP lookup) | ✅ Built-in |

### Why Both?

**Homegrown Analytics:**
- ✅ Full data ownership
- ✅ Custom queries and aggregations
- ✅ Real-time rental/watch data
- ✅ No sampling (100% data accuracy)
- ✅ Cross-device user tracking (via account)
- ✅ No external dependencies
- ❌ Requires maintenance
- ❌ Limited demographic data

**Google Analytics:**
- ✅ Industry-standard metrics
- ✅ Rich demographic data
- ✅ Marketing attribution
- ✅ Free (up to 10M events/month)
- ✅ No development effort
- ✅ Integration with Google Ads
- ❌ Sampling on high traffic
- ❌ Limited customization
- ❌ Privacy concerns (external tracking)

### Data Flow

```
User Action (e.g., rent movie)
    │
    ├──► Backend API
    │      ├─► Save to `rentals` table
    │      └─► Return rental confirmation
    │
    └──► Google Analytics
           └─► Send `purchase` event with transaction data
```

**Consistency Strategy:**
- Primary source of truth: **Homegrown database**
- Google Analytics: **Supplementary & marketing insights**
- Reconciliation: Weekly comparison of revenue totals
- Discrepancies: GA may have ad-blocker gaps (~10-15% of users)

## Query Examples

### Backend Analytics Queries

**Total platform revenue:**
```typescript
const revenue = await db
  .select({ total: sql<number>`SUM(price)` })
  .from(rentals)
  .where(eq(rentals.status, 'active'));
```

**Top movies by watch time:**
```typescript
const topMovies = await db
  .select({
    movieId: watchProgress.movieId,
    totalWatchTime: sql<number>`SUM(watch_time)`,
  })
  .from(watchProgress)
  .groupBy(watchProgress.movieId)
  .orderBy(desc(sql`SUM(watch_time)`))
  .limit(10);
```

**Completion rate per movie:**
```typescript
const completionRate = await db
  .select({
    movieId: videoAnalyticsEvents.movieId,
    completionRate: sql<number>`
      COUNT(CASE WHEN event_type = 'complete' THEN 1 END)::float / 
      COUNT(CASE WHEN event_type = 'start' THEN 1 END)
    `,
  })
  .from(videoAnalyticsEvents)
  .groupBy(videoAnalyticsEvents.movieId);
```

### Google Analytics Queries (GA4 API)

**Traffic sources:**
```javascript
// Using GA4 Data API
const response = await analyticsDataClient.runReport({
  property: `properties/${propertyId}`,
  dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
  dimensions: [{ name: 'sessionSource' }],
  metrics: [{ name: 'sessions' }],
});
```

## Reporting Cadence

### Real-Time (Admin Dashboard)
- Active rentals
- Current viewer count (future)
- Today's revenue

### Daily
- Revenue per day
- New rentals
- Unique viewers
- Top movies

### Weekly
- Revenue trends
- Completion rate changes
- Engagement metrics
- Content provider email digest (future)

### Monthly
- Financial reports
- Growth metrics
- Platform health
- Content performance rankings

## Future Enhancements

### Phase 1 (Q1 2026)
- [ ] Complete per-movie analytics UI
- [ ] Export analytics to CSV/PDF
- [ ] Email digest for admin
- [ ] Trailer view tracking
- [ ] Detail page visit tracking

### Phase 2 (Q2 2026)
- [ ] Content provider portal (studio login)
- [ ] Aggregate analytics by studio
- [ ] Comparative analytics (genre benchmarks)
- [ ] Revenue forecasting
- [ ] Geographic heatmaps (IP lookup)

### Phase 3 (Q3 2026)
- [ ] Real-time viewer count
- [ ] Live engagement dashboard
- [ ] Predictive analytics (watch time prediction)
- [ ] Churn analysis (rental → watch conversion)
- [ ] A/B testing framework

### Phase 4 (Q4 2026)
- [ ] Machine learning recommendations
- [ ] Anomaly detection (unusual traffic patterns)
- [ ] Automated marketing insights
- [ ] Custom report builder for studios

## Technical Considerations

### Performance
- Analytics queries use indexed columns (movieId, userId, createdAt)
- Aggregate calculations cached hourly for dashboard
- Heavy queries run asynchronously (background jobs)

### Scalability
- Partition `video_analytics_events` by month (if >10M rows)
- Use read replicas for analytics queries (production)
- Consider TimescaleDB for time-series data (future)

### Data Retention
- `video_analytics_events` - Keep 24 months
- `watch_progress` - Keep indefinitely (user feature)
- `rentals` - Keep indefinitely (financial records)

### Privacy & Compliance
- Anonymize IP addresses in GA
- Aggregate anonymous user data (no PII in analytics)
- GDPR-compliant data export/deletion
- Transparent privacy policy

## Related Documentation
- `docs/features/USER_ACCOUNTS.md` - User tracking implementation
- `docs/setup/STORAGE_STRATEGY.md` - Analytics data storage
- `docs/architecture/SCHEMA_OVERVIEW.md` - Database tables
- `docs/architecture/API_REFERENCE.md` - Analytics endpoints
