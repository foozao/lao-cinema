# Film Metadata Strategy Decision Tree
_Last updated: 2025-12-10_

## Goal
Determine whether new films should:
1. Be added to **TMDb** and synced into our site  
2. Be added **only to our site**, making our platform the canonical source

---

## High-Level Summary
We will use **our platform as the primary, authoritative film database**.

TMDb may be used *optionally* for discoverability, but only after the film is publicly released and only if beneficial to the filmmaker. Our site remains the source of truth.

---

# Decision Tree

## 1. Is the film unreleased, in development, or under festival embargo?
**→ YES**  
Add it **only to our site**.  
Do **not** add to TMDb.  
- Protects confidentiality  
- Prevents leaks or unofficial versions  
- Lets us control the initial narrative and metadata

**→ NO**  
Move to next step.

---

## 2. Do we want our site to be the official, canonical source for this film?
**→ YES (default)**  
Add the film **only to our site**.  
- Strengthens brand authority  
- Drives all traffic to our platform  
- Enables richer metadata than TMDb supports

**→ NO**  
Move to next step.

---

## 3. Does the filmmaker need global visibility (Letterboxd, Plex, Google indexing)?
**→ YES**  
Add the film to **TMDb manually**, then sync to our site.  
Use TMDb as a *secondary* presence, never the source of truth.

**→ NO**  
Keep the film **exclusive to our site**.

---

## 4. Is there a marketing or distribution reason to appear on TMDb?
Examples:
- Festival promotion  
- International sales  
- Publicity packages  
- Actors wanting credits visible globally  

**→ YES**  
Add to TMDb manually, but maintain **our site as canonical**.

**→ NO**  
Skip TMDb entirely.

---

# Final Strategy

## We default to:
**→ Add films only to our site.**

Benefits:
- Complete control of data  
- Exclusive traffic  
- Our platform becomes the definitive database for Lao / Terminal 8 / regional cinema  
- Flexible metadata not constrained by TMDb rules  
- Better SEO for “official film pages”  

## TMDb is optional and used only when:
- A film is fully released to the public  
- The filmmaker wants global discoverability  
- Additional visibility is strategically beneficial  

---

# Recommended Future Features
To support this strategy:

### 1. Robust Film Metadata Schema  
Titles, multilingual fields, credits, festivals, rights, availability, BTS materials.

### 2. Canonical URLs  
Stable SEO-friendly pages for every film:  
`/films/film-slug-2025`

### 3. Submission Workflow  
A simple portal for filmmakers to submit metadata, posters, and updates.

### 4. Structured Data for SEO  
Implement Open Graph + JSON-LD so Google recognizes us as a film database.

### 5. Optional Export Pack (Future)  
A one-click bundle for filmmakers to manually copy metadata to TMDb/IMDb if desired.

---

# Core Principle

**Our platform is the authoritative source for film information.**  
TMDb is supplemental, optional, and always secondary.
