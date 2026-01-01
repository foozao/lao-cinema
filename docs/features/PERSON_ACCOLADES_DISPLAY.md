# Person Page Accolades Display Guidelines

## Core Principle

**Never blur authorship, but don't hide relevance.**

A person page should show everything they were recognized for, but must distinguish what they won vs what the film won.

## Award Categorization

### Primary: Individual Awards & Recognition
Awards directly attributable to the person.

**Examples:**
- Best Actress — Locarno Film Festival (2022), Dearest Sister
- Best Director — Bangkok ASEAN Film Festival (2020), Film Title
- Best Supporting Actor — Luang Prabang Film Festival (2019), Film Title

**Display Treatment:**
- Normal weight
- Prominent placement
- Winner / Nominee labels
- Trophy/laurel icons appropriate
- Full accolade styling

### Secondary: Associated Film Accolades
Acknowledges that the person was part of an acclaimed film, without implying personal credit.

**Examples:**
- Dearest Sister — Special Mention, Sitges (2016)
- The Signal — Official Selection, Shanghai IFF · Asian Cinema New Talent (2023)
- Film Title — Best Film, Festival Name (2021)

**Display Treatment:**
- Smaller text
- Text-only (no trophy icons)
- Grouped under the film title
- No "Winner" badges unless it was personal
- De-emphasized visually
- Think: context, not credit

## UI Structure

### Recommended Layout

```
┌─────────────────────────────────────┐
│ Awards & Recognition                │  ← Primary section
│                                     │
│ 🏆 Best Actress                     │
│    Locarno Film Festival (2022)     │
│    Dearest Sister                   │
│                                     │
│ 🎬 Best Director                    │
│    Bangkok ASEAN (2020)             │
│    Film Title                       │
├─────────────────────────────────────┤
│ Associated Film Accolades           │  ← Secondary section
│                                     │
│ Dearest Sister                      │
│ • Special Mention, Sitges (2016)    │
│ • Official Selection, Cannes (2016) │
│                                     │
│ The Signal                          │
│ • Asian Cinema New Talent, Shanghai │
└─────────────────────────────────────┘
```

## What NOT to Do

❌ **Don't list a film's Best Film win as if the person won it**
- Wrong: "Winner — Best Film, Festival Name"
- Right: "Film Title — Best Film, Festival Name"

❌ **Don't mix film awards and personal awards in one flat list**
- Separate them into distinct sections

❌ **Don't use laurels or trophy icons for film-only awards on person pages**
- Icons imply personal achievement

❌ **Don't use "Winner" badges for film awards in secondary section**
- Use plain text listing instead

## Industry Context

This mirrors professional CV conventions:
- Actors list films that won major awards
- But they clearly separate:
  - "Awards" (personal)
  - "Films in Competition / Awarded Films" (contextual)

## Implementation Rule

**Simple decision tree:**

```
Is the award recipient the person?
├─ YES → Primary section (Awards & Recognition)
│         Full styling, icons, winner badges
│
└─ NO  → Secondary section (Associated Film Accolades)
          Text-only, grouped by film, de-emphasized
```

## Database Queries

### Personal Awards
```sql
SELECT * FROM accolades
WHERE person_id = :personId
AND is_person_award = true
```

### Film Accolades (where person participated)
```sql
SELECT DISTINCT a.*, m.title
FROM accolades a
JOIN movies m ON a.movie_id = m.id
LEFT JOIN movie_cast mc ON m.id = mc.movie_id
LEFT JOIN movie_crew mcr ON m.id = mcr.movie_id
WHERE (mc.person_id = :personId OR mcr.person_id = :personId)
AND a.is_person_award = false
```

## Visual Hierarchy

### Primary Section
- Font size: Normal (base)
- Font weight: Medium/Semibold
- Icons: Yes (trophy, laurel)
- Badges: Yes (Winner/Nominee)
- Spacing: Generous
- Background: Subtle highlight on hover

### Secondary Section
- Font size: Smaller (-1 step)
- Font weight: Normal
- Icons: No
- Badges: No
- Spacing: Compact
- Background: None
- Text color: Muted (text-muted-foreground)

## Example Implementation

```tsx
<div className="space-y-8">
  {/* Primary: Personal Awards */}
  {personalAwards.length > 0 && (
    <section>
      <h2 className="text-2xl font-bold mb-4">
        Awards & Recognition
      </h2>
      <div className="grid gap-4">
        {personalAwards.map(award => (
          <AccoladeCard key={award.id} accolade={award} />
        ))}
      </div>
    </section>
  )}

  {/* Secondary: Film Accolades */}
  {filmAccolades.length > 0 && (
    <section>
      <h2 className="text-xl font-semibold mb-3 text-muted-foreground">
        Associated Film Accolades
      </h2>
      <div className="space-y-4">
        {groupedByFilm.map(({ film, accolades }) => (
          <div key={film.id} className="text-sm">
            <h3 className="font-medium mb-1">{film.title}</h3>
            <ul className="space-y-1 text-muted-foreground">
              {accolades.map(acc => (
                <li key={acc.id}>• {acc.award_name}, {acc.festival_name}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )}
</div>
```

## Key Takeaways

1. **Transparency**: Always make it clear who won what
2. **Context**: Film accolades provide career context without false credit
3. **Visual Hierarchy**: Use design to communicate the distinction
4. **Industry Standard**: This matches how professionals present their work
5. **Honesty**: Never mislead about who received recognition
