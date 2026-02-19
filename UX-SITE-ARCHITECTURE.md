# RNTell Site Architecture & Design System Blueprint

> Extension of UX-ARCHITECTURE.md. Does NOT rewrite the first-time nurse flow.
> Does NOT modify database schema, financial engine, or incentive layer placement.
> Housing marketplace and roommate matching exist in schema but are **deferred from MVP**.

---

## PART 1 — GLOBAL PAGE HIERARCHY

```
/                                   PUBLIC    Marketing         Homepage
├── /jobs                           PUBLIC    Marketplace       Job Board
│   └── /jobs/[id]                  PUBLIC    Marketplace       Job Detail
├── /analyze                        PUBLIC    Financial Tools   Contract Analyzer
├── /about                          PUBLIC    Marketing         About / Mission
├── /contact                        PUBLIC    Marketing         Contact Form
├── /login                          PUBLIC    Account           Login
├── /signup                         PUBLIC    Account           Signup
│
├── /dashboard                      AUTH      Account           Market Snapshot
├── /nurse                          AUTH      Financial Tools   My License HQ
│   ├── /nurse/pay-intelligence     AUTH      Financial Tools   Pay Intelligence
│   ├── /nurse/salary               AUTH      Financial Tools   Pay Database
│   │   └── /nurse/salary/submit    AUTH      Financial Tools   Submit Salary
│   ├── /nurse/jobs                 AUTH      Marketplace       My Applications
│   └── /nurse/credentials          AUTH      Account           Credential Vault
│
├── /facility                       AUTH      Marketplace       Employer Dashboard
│   ├── /facility/[id]              AUTH      Marketplace       Facility Profile
│   ├── /facility/jobs              AUTH      Marketplace       My Job Postings
│   │   ├── /facility/jobs/new      AUTH      Marketplace       Create Posting
│   │   └── /facility/jobs/[id]/edit AUTH     Marketplace       Edit Posting
│   └── /facility/applications      AUTH      Marketplace       Applications Inbox
│       └── /facility/applications/[id] AUTH  Marketplace       Application Detail
│
└── /admin                          AUTH      Admin             Admin Portal
    ├── /admin/nurses               AUTH      Admin             Manage Nurses
    ├── /admin/facilities           AUTH      Admin             Manage Facilities
    ├── /admin/jobs                 AUTH      Admin             Manage Jobs
    ├── /admin/analyses             AUTH      Admin             Analyses
    └── /admin/settings             AUTH      Admin             Settings
```

### Navigation Groupings

```
MARKETING             MARKETPLACE           FINANCIAL TOOLS       ACCOUNT
─────────             ───────────           ───────────────       ───────
Homepage /            Job Board /jobs       Analyze Offer         Login /login
About /about          Job Detail            /analyze              Signup /signup
Contact /contact        /jobs/[id]          Pay Intelligence      Dashboard
                      My Applications         /nurse/pay-intel.   My License HQ
                        /nurse/jobs         Pay Database            /nurse
                      Employer Dashboard      /nurse/salary       Credentials
                        /facility           Submit Salary           /nurse/credentials
                      Job Postings            /nurse/salary/sub.
                        /facility/jobs
                      Applications
                        /facility/applications
```

### Deferred Modules (exist in schema, NOT in MVP navigation)

```
DEFERRED — DO NOT BUILD UI
─────────────────────────────
/nurse/social              Roommate matching (nurse_vetting, nurse social profiles)
/nurse/social/profile      RN community profile
/rentals                   Rental marketplace (rental_listings, landlords)
/rentals/[id]              Rental detail
/nurse/rentals             Rental agreements
/admin/rentals             Admin rental management
/admin/fees                Fee management
/admin/credentials         Admin credential management

Status: Database tables exist. UI deferred to post-MVP.
        Not visible in navigation. Not referenced in marketing pages
        except as "Coming Soon" roadmap items on /about.
```

---

## PART 2 — HOMEPAGE STRUCTURE (CONTRACT-FIRST POSITIONING)

**Route:** `/`
**File:** `src/app/page.tsx`
**Auth:** None required

```
┌──────────────────────────────────────────────────────────────┐
│  NAVBAR (existing)                                            │
│  [RNTell]  [Find Jobs]  [Analyze an Offer]  [Sign In] [Get Started]│
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  ═══════════════════════════════════════════════════════════   │
│  SECTION 1: HERO                                               │
│  bg: gradient brand-peach-50 → brand-warm                      │
│  ═══════════════════════════════════════════════════════════   │
│                                                                │
│  Headline:                                                     │
│  "The Financial Decision Engine for Travel Nurses"             │
│                                                                │
│  Subheadline:                                                  │
│  "Analyze any contract. See your real take-home.               │
│   Detect margin risk before you sign."                         │
│                                                                │
│  ┌────────────────────┐  ┌────────────────────┐               │
│  │  Analyze My Offer   │  │    Find Jobs       │               │
│  │  (primary/orange)   │  │  (outline/orange)  │               │
│  │  → /analyze         │  │  → /jobs           │               │
│  └────────────────────┘  └────────────────────┘               │
│                                                                │
│  TRUST SIGNALS ROW (4 inline pills / icon+text)                │
│  ┌─────────────┐ ┌─────────────┐ ┌──────────────┐ ┌──────────┐│
│  │ DollarSign  │ │ ShieldCheck │ │ Award        │ │ Building ││
│  │ "See your   │ │ "GSA stipend│ │ "Federal     │ │ "Direct  ││
│  │  real       │ │  comparison"│ │  eligibility │ │  facility││
│  │  take-home" │ │             │ │  detection"  │ │  apps"   ││
│  └─────────────┘ └─────────────┘ └──────────────┘ └──────────┘│
│                                                                │
│  Visual note: contract analysis is the intelligence engine.    │
│  Hero illustration/mockup of analysis result card              │
│  (optional, not a blocker).                                    │
│                                                                │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  ═══════════════════════════════════════════════════════════   │
│  SECTION 2: VALUE PROPOSITION (below the fold)                 │
│  bg: white                                                     │
│  ═══════════════════════════════════════════════════════════   │
│                                                                │
│  Headline: "Know More. Earn More. Own Your Career."            │
│  Subhead: "RNTell gives you the financial intelligence         │
│            that was hidden behind middlemen."                   │
│                                                                │
│  3 HOVER-FLIP CARDS (desktop: 3-column grid)                   │
│                                                                │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐│
│  │  CARD 1 — FRONT  │  │  CARD 2 — FRONT  │  │ CARD 3—FRONT ││
│  │                  │  │                  │  │              ││
│  │  [DollarSign]    │  │  [Award]         │  │ [Target]     ││
│  │                  │  │                  │  │              ││
│  │  "Real           │  │  "Federal &      │  │ "Smarter     ││
│  │   Take-Home      │  │   Long-Term      │  │  Job         ││
│  │   Clarity"       │  │   Value          │  │  Matching"   ││
│  │                  │  │   Detection"     │  │              ││
│  │  "Know What You  │  │  "Surface Loan   │  │ "Match Based ││
│  │   Actually Earn" │  │   Forgiveness    │  │  on Fit &    ││
│  │                  │  │   Opportunities" │  │  Financial   ││
│  │                  │  │                  │  │  Strength"   ││
│  └──────────────────┘  └──────────────────┘  └──────────────┘│
│                                                                │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐│
│  │  CARD 1 — BACK   │  │  CARD 2 — BACK   │  │ CARD 3—BACK  ││
│  │                  │  │                  │  │              ││
│  │  Net pay after   │  │  PSLF detection, │  │ Smart Match  ││
│  │  housing,        │  │  HRSA HPSA       │  │ scoring +    ││
│  │  stipend         │  │  lookup,         │  │ financial    ││
│  │  breakdown,      │  │  federal         │  │ preview      ││
│  │  margin          │  │  strength score  │  │ for each     ││
│  │  detection       │  │                  │  │ matched job  ││
│  └──────────────────┘  └──────────────────┘  └──────────────┘│
│                                                                │
│  INTERACTION BEHAVIOR:                                         │
│  Desktop: CSS perspective flip on hover (transform-style:      │
│           preserve-3d, rotateY(180deg)). 300ms ease.           │
│  Mobile:  Tap to expand back content (accordion, no 3D flip).  │
│           Chevron icon indicates expandable.                    │
│  Accessibility: aria-label on each card. Back content is       │
│           always in DOM (aria-hidden toggles). Keyboard:       │
│           focus triggers flip same as hover.                    │
│                                                                │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  ═══════════════════════════════════════════════════════════   │
│  SECTION 3: FEATURED JOBS FEED                                 │
│  bg: brand-warm (#FAFAF8)                                      │
│  ═══════════════════════════════════════════════════════════   │
│                                                                │
│  Headline: "Featured Assignments"                              │
│  Subhead: "The latest direct-hire and verified opportunities." │
│                                                                │
│  DATA SOURCE:                                                  │
│    SELECT * FROM job_postings                                  │
│    WHERE is_active = true                                      │
│    ORDER BY created_at DESC                                    │
│    LIMIT 5                                                     │
│                                                                │
│  5 JOB CARDS (horizontal scroll mobile, grid desktop)          │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐     │
│  │ Facility Name  │ │ Facility Name  │ │ Facility Name  │     │
│  │ City, ST       │ │ City, ST       │ │ City, ST       │     │
│  │                │ │                │ │                │     │
│  │ ICU  |  Day    │ │ ER  |  Night   │ │ OR  |  Rotating│     │
│  │                │ │                │ │                │     │
│  │ $2,400/wk      │ │ $2,800/wk      │ │ $2,100/wk      │     │
│  │                │ │                │ │                │     │
│  │ [View Details] │ │ [View Details] │ │ [View Details] │     │
│  └────────────────┘ └────────────────┘ └────────────────┘     │
│                                                                │
│  Each card shows:                                              │
│  - Facility name (from facilities join)                        │
│  - City, State                                                 │
│  - Specialty                                                   │
│  - Shift type (mapped via SHIFT_LABELS)                        │
│  - Weekly pay package (teal #26C6DA)                           │
│  - "View Details" → /jobs/[id]                                 │
│                                                                │
│  DO NOT show: incentive badges, trust badges, "Analyze" CTA.  │
│  Incentives remain inside analysis flow only.                  │
│                                                                │
│  CTA: "View All Jobs" → /jobs (outline button, centered)      │
│                                                                │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  ═══════════════════════════════════════════════════════════   │
│  SECTION 4: BOTTOM CTA (repeated conversion band)              │
│  bg: brand-charcoal (#2C2C2C), text: white                     │
│  ═══════════════════════════════════════════════════════════   │
│                                                                │
│  "Ready to see what your contract is really worth?"            │
│  [Analyze My Offer] (orange button, full-width on mobile)      │
│  → /analyze                                                    │
│                                                                │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  ═══════════════════════════════════════════════════════════   │
│  SECTION 5: FOOTER                                             │
│  bg: #1A1A1A, text: #CCCCCC                                   │
│  ═══════════════════════════════════════════════════════════   │
│                                                                │
│  (See PART 2 — FOOTER STRUCTURE below)                         │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

### Homepage Component Hierarchy

```
src/app/page.tsx (server component)
├── <Navbar />                               (existing, no changes)
│
├── <HeroSection />                          (new or refactored)
│   ├── h1: headline
│   ├── p: subheadline
│   ├── <Link href="/analyze" />             (primary CTA — orange solid)
│   ├── <Link href="/jobs" />                (secondary CTA — orange outline)
│   └── <TrustSignals />                     (4 icon+text pills)
│       ├── DollarSign + "See your real take-home"
│       ├── ShieldCheck + "GSA stipend comparison"
│       ├── Award + "Federal eligibility detection"
│       └── Building2 + "Direct facility applications"
│
├── <ValueProposition />                     (new)
│   ├── h2: section headline
│   ├── p: section subhead
│   └── <FlipCardGrid />                    (3 cards)
│       ├── <FlipCard front={...} back={...} />  — Take-Home Clarity
│       ├── <FlipCard front={...} back={...} />  — Federal Value Detection
│       └── <FlipCard front={...} back={...} />  — Smarter Matching
│
├── <FeaturedJobs jobs={recentJobs} />       (new — server-fetched)
│   ├── h2: "Featured Assignments"
│   ├── <JobCardCompact /> × 5               (minimal version of JobCard)
│   └── <Link href="/jobs" />                ("View All Jobs")
│
├── <BottomCTA />                            (new — dark band)
│   └── <Link href="/analyze" />             (orange button)
│
└── <Footer />                               (new — site-wide)
```

### Homepage Data Requirements

| Data | Source | Auth | Notes |
|------|--------|------|-------|
| Featured jobs (5) | `job_postings` WHERE is_active ORDER BY created_at DESC LIMIT 5 | No | Join facilities for name/location |
| Static content | Inline | No | Hero, value props, trust signals |

---

## FOOTER STRUCTURE (Site-Wide)

**Component:** `src/components/ui/Footer.tsx`
**Rendered on:** All public pages + dashboard pages

```
┌──────────────────────────────────────────────────────────────┐
│  FOOTER                                                        │
│  bg: #1A1A1A  |  text: #CCCCCC  |  links: white on hover      │
│                                                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ EXPLORE  │  │ COMPANY  │  │ ACCOUNT  │  │ LEGAL    │      │
│  │          │  │          │  │          │  │          │      │
│  │ Job Board│  │ About    │  │ Sign In  │  │ Privacy  │      │
│  │ Analyze  │  │ Contact  │  │ Sign Up  │  │ Terms    │      │
│  │ an Offer │  │          │  │ Dashboard│  │          │      │
│  │          │  │          │  │ (if auth)│  │          │      │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │
│                                                                │
│  ─────────────────────────────────────────────────────────     │
│  © 2026 RNTell. All rights reserved.                           │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

### Footer Logic

```
Account column (conditional):
  IF logged out:
    - Sign In → /login
    - Get Started → /signup
  IF logged in:
    - Dashboard → /dashboard
    - My License HQ → /nurse  (nurse role)
    - Employer Dashboard → /facility  (facility role)
    - Sign Out (action)
```

---

## PART 3 — ABOUT PAGE

**Route:** `/about`
**File:** `src/app/about/page.tsx`
**Auth:** None required

```
┌──────────────────────────────────────────────────────────────┐
│  <Navbar />                                                    │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  SECTION 1: MISSION                                            │
│  bg: brand-warm                                                │
│  ──────────────────────────────────────────────────────────   │
│                                                                │
│  Headline: "Financial Clarity for Every Travel Nurse"          │
│                                                                │
│  Body: 2-3 sentences positioning RNTell as the financial       │
│  intelligence layer that eliminates pay confusion and gives    │
│  nurses direct access to market data, contract analysis, and   │
│  federal incentive detection.                                  │
│                                                                │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  SECTION 2: THE PROBLEM                                        │
│  bg: white                                                     │
│  ──────────────────────────────────────────────────────────   │
│                                                                │
│  Headline: "The Challenges Travel Nurses Face"                 │
│                                                                │
│  4 problem cards (2×2 grid):                                   │
│                                                                │
│  ┌─────────────────────┐  ┌─────────────────────┐            │
│  │ [DollarSign]        │  │ [Home]              │            │
│  │ Pay Confusion       │  │ Stipend Misalignment│            │
│  │ Hourly rates,       │  │ Housing and meal     │            │
│  │ stipends, and bill  │  │ stipends often don't │            │
│  │ rates obscure real  │  │ match GSA rates,     │            │
│  │ take-home pay.      │  │ creating hidden       │            │
│  │                     │  │ margin gaps.          │            │
│  └─────────────────────┘  └─────────────────────┘            │
│  ┌─────────────────────┐  ┌─────────────────────┐            │
│  │ [ShieldAlert]       │  │ [FileSearch]        │            │
│  │ Compliance Risk     │  │ Limited Visibility  │            │
│  │ Wage recharacteriz. │  │ Nurses lack insight │            │
│  │ and taxability      │  │ into employer        │            │
│  │ rules are complex   │  │ classification,      │            │
│  │ and poorly          │  │ 501(c)(3) status,    │            │
│  │ communicated.       │  │ and federal program   │            │
│  │                     │  │ eligibility.          │            │
│  └─────────────────────┘  └─────────────────────┘            │
│                                                                │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  SECTION 3: HOW RNTELL WORKS                                   │
│  bg: brand-warm                                                │
│  ──────────────────────────────────────────────────────────   │
│                                                                │
│  Headline: "How It Works"                                      │
│                                                                │
│  3-step horizontal flow (reuses homepage HowItWorks pattern):  │
│                                                                │
│  Step 1                  Step 2                  Step 3        │
│  ┌─────────┐            ┌─────────┐            ┌─────────┐   │
│  │ [Upload]│     →      │ [Chart] │     →      │ [Check] │   │
│  │         │            │         │            │         │   │
│  │ Analyze │            │ Compare │            │ Apply   │   │
│  │ Your    │            │ to      │            │ Direct  │   │
│  │ Offer   │            │ Market  │            │         │   │
│  └─────────┘            └─────────┘            └─────────┘   │
│                                                                │
│  Step 1: "Enter your contract or upload a PDF. Get an          │
│           instant financial breakdown."                         │
│  Step 2: "See how your pay, stipends, and benefits compare     │
│           to GSA benchmarks and market data."                   │
│  Step 3: "Apply directly to facilities. No middlemen.          │
│           No margin on your pay."                               │
│                                                                │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  SECTION 4: ROADMAP / COMING SOON                              │
│  bg: white                                                     │
│  ──────────────────────────────────────────────────────────   │
│                                                                │
│  Headline: "What's Next"                                       │
│                                                                │
│  2 coming-soon cards (muted, no links):                        │
│                                                                │
│  ┌──────────────────────────────┐  ┌─────────────────────────┐│
│  │ [Home] Housing Optimization  │  │ [Users] RN Community &  ││
│  │                              │  │  Roommate Matching       ││
│  │ Rental marketplace for       │  │                          ││
│  │ travel nurse housing.        │  │ Connect with other nurses││
│  │                              │  │ and find roommates.      ││
│  │ "Coming Soon"  (gray badge)  │  │                          ││
│  │                              │  │ "Coming Soon" (gray)     ││
│  └──────────────────────────────┘  └─────────────────────────┘│
│                                                                │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  BOTTOM CTA                                                    │
│  bg: brand-charcoal                                            │
│  "See what your next contract is really worth."                │
│  [Analyze My Offer] → /analyze                                 │
│                                                                │
├──────────────────────────────────────────────────────────────┤
│  <Footer />                                                    │
└──────────────────────────────────────────────────────────────┘
```

### About Page Component Hierarchy

```
src/app/about/page.tsx (server component)
├── <Navbar />
├── <MissionSection />
│   ├── h1: headline
│   └── p: body text
├── <ProblemCards />
│   └── 4 × <SectionCard icon={...} title={...} body={...} />
├── <HowItWorks />                   (shared component with homepage)
├── <RoadmapSection />
│   └── 2 × <ComingSoonCard title={...} body={...} />
├── <BottomCTA />                    (shared component)
└── <Footer />
```

---

## PART 4 — CONTACT PAGE

**Route:** `/contact`
**File:** `src/app/contact/page.tsx`
**Auth:** None required

```
┌──────────────────────────────────────────────────────────────┐
│  <Navbar />                                                    │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  CONTACT                                                       │
│  bg: brand-warm                                                │
│  ──────────────────────────────────────────────────────────   │
│                                                                │
│  Headline: "Get in Touch"                                      │
│  Subhead: "Have questions? We'd love to hear from you."        │
│                                                                │
│  ┌────────────────────────────────────────────┐               │
│  │  CONTACT FORM                               │               │
│  │  bg: white, rounded-xl, shadow-sm           │               │
│  │                                             │               │
│  │  Name *          [text input]               │               │
│  │  Email *         [email input]              │               │
│  │  I am a...       [select: Nurse / Facility /│               │
│  │                   Landlord / Other]          │               │
│  │  Message *       [textarea, 4 rows]         │               │
│  │                                             │               │
│  │  [Send Message]  (orange button)            │               │
│  │                                             │               │
│  └────────────────────────────────────────────┘               │
│                                                                │
│  SIDEBAR INFO (right column desktop, below form mobile):       │
│  ┌────────────────────────────────────────────┐               │
│  │  Email: support@rntell.com                  │               │
│  │                                             │               │
│  │  Looking for help?                          │               │
│  │  Check our FAQ (link — future page or       │               │
│  │  section anchor)                            │               │
│  └────────────────────────────────────────────┘               │
│                                                                │
├──────────────────────────────────────────────────────────────┤
│  <Footer />                                                    │
└──────────────────────────────────────────────────────────────┘
```

### Contact Form Server Action

```
src/app/actions/contact.ts

submitContactForm({ name, email, role, message })
  → Option A: Send via email service (Resend, SendGrid, etc.)
  → Option B: Insert into Supabase `contact_submissions` table
  → Option C: Forward to support@rntell.com via API route

MVP recommendation: Option B (simple Supabase table) or Option A.
Returns: { success: boolean, error?: string }
```

### Contact Page Component Hierarchy

```
src/app/contact/page.tsx (server component)
├── <Navbar />
├── <ContactHeader />
│   ├── h1: "Get in Touch"
│   └── p: subhead
├── <div className="grid grid-cols-1 lg:grid-cols-3">
│   ├── <ContactForm />              (client component — 2 cols)
│   │   ├── name input
│   │   ├── email input
│   │   ├── role select
│   │   ├── message textarea
│   │   └── submit button
│   └── <ContactInfo />              (1 col)
│       ├── email display
│       └── FAQ link
├── <Footer />
```

---

## PART 5 — DESIGN SYSTEM ADDITIONS

### Brand Colors (existing in globals.css @theme inline)

| Token | Hex | Usage |
|-------|-----|-------|
| `brand-orange` | `#FF7043` | Primary CTA, buttons, active states |
| `brand-peach-50` | `#FFE5E5` | Auth backgrounds, hero gradient start |
| `brand-charcoal` | `#2C2C2C` | Primary text, dark sections |
| `brand-warm` | `#FAFAF8` | Default page background |

### Extended Palette (add to globals.css)

| Token | Hex | Usage |
|-------|-----|-------|
| `brand-teal` | `#26C6DA` | Pay/financial figures, weekly package |
| `brand-mint-50` | `#E8F5E9` | Trust anchor backgrounds, success states |
| `brand-gray-100` | `#F5F5F5` | Card backgrounds, dividers |
| `brand-gray-500` | `#666666` | Secondary text, hourly rate display |
| `brand-red` | `#EF5350` | High risk, red badges |
| `brand-amber` | `#FFB300` | Medium risk, amber badges |
| `brand-green` | `#66BB6A` | Low risk, green badges, success |
| `footer-bg` | `#1A1A1A` | Footer background |
| `footer-text` | `#CCCCCC` | Footer text |

### Core UI Components

```
EXISTING COMPONENTS (no changes)
────────────────────────────────
JobCard.tsx              — Full job card (used on /jobs)
PublicJobFilters.tsx      — Sidebar filter panel
JobAlertForm.tsx          — Email capture for job alerts
ApplyModal.tsx            — Apply overlay
SalarySubmitForm.tsx      — Salary submission
SalaryFilters.tsx         — Salary dashboard filters
ReviewForm.tsx            — Facility review form
AuthForm.tsx              — Login/signup form
Navbar.tsx                — Top navigation bar

NEW COMPONENTS
────────────────────────────────
Footer.tsx               — Site-wide footer (4-column layout)
FlipCard.tsx             — Hover/tap flip card (value props)
JobCardCompact.tsx       — Minimal job card (featured jobs on homepage)
SectionContainer.tsx     — Reusable section wrapper (bg, padding, max-width)
CTAButton.tsx            — Standardized CTA button (solid + outline variants)
FinancialInsightCard.tsx — Dashboard card for analysis snapshot
IncentiveCard.tsx        — Federal incentive display (in analysis results)
RiskBadge.tsx            — Color-coded risk severity badge
ContactForm.tsx          — Contact page form (client component)
ComingSoonCard.tsx       — Muted card with "Coming Soon" badge
HowItWorks.tsx           — 3-step visual flow (shared: homepage + about)
TrustSignals.tsx         — 4-pill trust signal row (homepage hero)
```

### Component Specifications

#### FlipCard

```
<FlipCard
  icon={LucideIcon}
  title={string}
  subtitle={string}         // front face
  backContent={string}       // back face
/>

Behavior:
  Desktop: CSS perspective transform on hover
    .flip-card { perspective: 1000px; }
    .flip-card-inner { transition: transform 0.3s; transform-style: preserve-3d; }
    .flip-card:hover .flip-card-inner { transform: rotateY(180deg); }
    .flip-card-front, .flip-card-back { backface-visibility: hidden; }
    .flip-card-back { transform: rotateY(180deg); }

  Mobile: No flip. Tap expands back content as accordion below card.
    Uses state toggle + max-height transition.
    Chevron icon rotates on expand.

  Accessibility:
    role="group"
    aria-label="{title}"
    Back content in DOM always (aria-hidden toggled)
    Keyboard: focus triggers flip (same as hover)
    Reduced motion: instant swap, no animation (prefers-reduced-motion)
```

#### JobCardCompact

```
<JobCardCompact
  job={JobPosting & { facility_name, city, state }}
/>

Layout: Vertical card, ~250px wide
  - Facility name (bold, truncate)
  - City, State (gray-500)
  - Specialty | Shift type (small, gray)
  - Weekly pay (teal, bold, large)
  - "View Details" link → /jobs/[id]

No: trust badges, "Analyze" CTA, incentive indicators
```

#### SectionContainer

```
<SectionContainer
  bg="white" | "brand-warm" | "brand-charcoal" | "brand-mint-50"
  className?={string}
>
  {children}
</SectionContainer>

Renders:
  <section className={`py-16 md:py-24 ${bgClass}`}>
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      {children}
    </div>
  </section>
```

#### RiskBadge

```
<RiskBadge level="low" | "medium" | "high" label?={string} />

Variants:
  low:    bg-green-100 text-green-800   — "Low Risk"
  medium: bg-amber-100 text-amber-800   — "Medium Risk"
  high:   bg-red-100   text-red-800     — "High Risk"

Used in: Analysis results, dashboard financial snapshot
```

#### FinancialInsightCard

```
<FinancialInsightCard analysis={ContractAnalysis | null} />

IF analysis exists:
  - Facility name + location
  - Weekly package (teal, large)
  - Margin severity badge (RiskBadge)
  - Federal flags: "PSLF Eligible" / "HPSA Area" (small pills)
  - "View Full Analysis" link

IF null:
  - Empty state: "No contract analyzed yet"
  - [Analyze Your First Offer] → /analyze
```

#### IncentiveCard

```
<IncentiveCard layer={FederalIncentiveLayer} />

Sections:
  PSLF: eligibility badge + confidence + employer type + notes
  HRSA: eligibility badge + HPSA type + score + notes
  Federal Strength Score: progress bar (0-100)
  Federal Opportunity Flag: "Opportunity Detected" (if true)

Display rules: Only inside /analyze results. Never on /jobs or homepage.
```

### Badge System

#### Financial Strength (Margin Risk)

```
Derived from: analysis_result.margin_gap_percent

  Green:  gap ≤ 5%    → "Strong"       bg-green-100 text-green-800
  Yellow: gap 5-15%   → "Moderate"     bg-amber-100 text-amber-800
  Red:    gap > 15%   → "At Risk"      bg-red-100   text-red-800
```

#### Audit Risk Score

```
Derived from: analysis_result.audit_risk_score (0-100)

  Visual: horizontal progress bar
  0-30:   green fill   — "Low Audit Risk"
  31-60:  amber fill   — "Moderate Audit Risk"
  61-100: red fill     — "High Audit Risk"

  Component: <AuditRiskBar score={number} />
  Width: score% of container, min 8% (so bar is always visible)
  Label: "{score}/100 — {level}"
```

#### Federal Opportunity Indicator

```
Derived from: federal_incentive_layer.federal_opportunity_flag

  IF true:
    Pill: bg-blue-100 text-blue-800 "Federal Opportunity Detected"
    Icon: Award (lucide)

  IF false:
    No indicator shown (not a "no opportunity" badge)
```

---

## PART 6 — STATE LOGIC (AUTH-DEPENDENT BEHAVIOR)

### Logged Out State

```
VISIBLE:
  - Homepage (/)           → full marketing site
  - Job Board (/jobs)      → browse, filter, sort
  - Job Detail (/jobs/[id])→ full detail, pay breakdown, estimated net
  - Analyze Offer (/analyze) → full input + partial results
  - About (/about)         → full page
  - Contact (/contact)     → full page + form

GATED:
  - Apply to job           → redirect to /signup?from=jobs&job_id=X
  - Save analysis          → CTA banner + blur overlay
  - Optimization details   → blur overlay
  - Dashboard              → redirect to /login
  - Any /nurse/* route     → redirect to /login
  - Any /facility/* route  → redirect to /login

NAVBAR:
  [RNTell]  [Find Jobs]  [Analyze an Offer]  [Sign In]  [Get Started]

FOOTER ACCOUNT COLUMN:
  Sign In → /login
  Get Started → /signup
```

### Logged In (Nurse) State

```
VISIBLE:
  - All public pages (homepage still accessible)
  - Dashboard (/dashboard)  → Market Snapshot
  - My License HQ (/nurse)  → Personalized dashboard
    - Financial Snapshot with latest analysis
    - Smart Match feed (top 5 matched jobs)
    - Optimize Earnings actions
  - Pay Intelligence (/nurse/pay-intelligence)
  - Pay Database (/nurse/salary)
  - My Applications (/nurse/jobs) → application tracker
  - Credential Vault (/nurse/credentials)

BEHAVIORAL CHANGES:
  - /jobs shows "Matched for You" section at top (existing)
  - /jobs/[id] "Apply Now" opens ApplyModal directly (no redirect)
  - /analyze saves with nurse_id (no session_id cookie needed)
  - /analyze results show full content (no blur)

NAVBAR (authenticated):
  [RNTell]  [Find Jobs]  [Analyze an Offer]  [Dashboard]

SIDEBAR:
  Market Snapshot        → /dashboard
  ──────────────────────
  My License HQ          → /nurse
  Pay Intelligence       → /nurse/pay-intelligence  (highlighted)
  Pay Database           → /nurse/salary
  My Applications        → /nurse/jobs
  Credential Vault       → /nurse/credentials
  ──────────────────────
  Sign Out
```

### Logged In (Facility) State

```
VISIBLE:
  - All public pages
  - Dashboard (/dashboard)  → Market Snapshot
  - Employer Dashboard (/facility)
  - My Job Postings (/facility/jobs)
  - Create/Edit Postings
  - Applications Inbox (/facility/applications)

NAVBAR (authenticated):
  [RNTell]  [Find Jobs]  [Analyze an Offer]  [Dashboard]

SIDEBAR:
  Market Snapshot          → /dashboard
  ──────────────────────
  Employer Dashboard       → /facility
  My Job Postings          → /facility/jobs
  Applications             → /facility/applications
  ──────────────────────
  Sign Out
```

---

## PART 7 — SITEMAP (CRAWLABLE / SEO)

### Public Sitemap (for search engines)

```xml
/                     — Homepage
/jobs                 — Job Board
/jobs/[id]            — Job Detail (dynamic, per active posting)
/analyze              — Contract Analyzer
/about                — About / Mission
/contact              — Contact
/login                — Login
/signup               — Signup
```

### Authenticated Sitemap (not indexed, noindex meta)

```
/dashboard
/nurse
/nurse/pay-intelligence
/nurse/salary
/nurse/salary/submit
/nurse/jobs
/nurse/credentials
/facility
/facility/[id]
/facility/jobs
/facility/jobs/new
/facility/jobs/[id]/edit
/facility/applications
/facility/applications/[id]
/admin/*
```

### robots.txt Guidance

```
User-agent: *
Allow: /
Allow: /jobs
Allow: /analyze
Allow: /about
Allow: /contact
Disallow: /dashboard
Disallow: /nurse
Disallow: /facility
Disallow: /admin
Sitemap: https://rntell.com/sitemap.xml
```

---

## DELIVERABLE SUMMARY

### 1. Full Page Hierarchy Tree
See Part 1 — 30+ routes organized into Marketing, Marketplace, Financial Tools, Account.

### 2. Homepage Wireframe Structure
See Part 2 — 5 sections: Hero, Value Props (flip cards), Featured Jobs, Bottom CTA, Footer.

### 3. Component Map Per Section

| Section | Components |
|---------|-----------|
| Homepage Hero | HeroSection, TrustSignals, CTAButton |
| Homepage Value Props | ValueProposition, FlipCardGrid, FlipCard |
| Homepage Featured Jobs | FeaturedJobs, JobCardCompact |
| Homepage Bottom CTA | BottomCTA, CTAButton |
| Footer (all pages) | Footer |
| About Page | MissionSection, ProblemCards, SectionCard, HowItWorks, RoadmapSection, ComingSoonCard, BottomCTA |
| Contact Page | ContactHeader, ContactForm, ContactInfo |
| Analysis Results | IncentiveCard, RiskBadge, AuditRiskBar, LockedSection |
| Nurse Dashboard | FinancialInsightCard, SmartMatches, OptimizeEarnings |

### 4. Footer Sitemap Structure
See Footer Structure — 4 columns: Explore, Company, Account (conditional), Legal.

### 5. Design System Additions
See Part 5 — Extended palette, 12 new components, 3 badge systems (financial strength, audit risk, federal opportunity).

### 6. Deferred Modules
Housing marketplace (rental_listings, landlords, rental_agreements) — schema exists, UI deferred.
RN community & roommate matching (nurse_vetting, nurse_social) — schema exists, UI deferred.
Both appear as "Coming Soon" on /about roadmap section only. Not in navigation.

### 7. Marketing vs Financial Tool Layer Separation

```
MARKETING LAYER (public, SEO-indexed, conversion-focused)
──────────────────────────────────────────────────────────
/                Homepage — funnel entry
/about           Mission + roadmap
/contact         Support + inquiries
/login           Auth entry
/signup          Auth entry

MARKETPLACE LAYER (public browsing, auth for actions)
──────────────────────────────────────────────────────────
/jobs            Job board — browse public
/jobs/[id]       Job detail — browse public, apply gated

FINANCIAL TOOLS LAYER (core product value)
──────────────────────────────────────────────────────────
/analyze         Contract analyzer — public input, partial results
                 Federal incentives live HERE (inside analysis)
/nurse           Financial dashboard — auth required
/nurse/pay-*     Pay intelligence + database — auth required
/nurse/salary/*  Salary data — auth required

ACCOUNT LAYER (authenticated management)
──────────────────────────────────────────────────────────
/dashboard       Market snapshot — auth required
/nurse/jobs      My applications — auth required
/nurse/creds     Credential vault — auth required
/facility/*      Employer tools — auth required
/admin/*         Admin portal — admin role required
```
