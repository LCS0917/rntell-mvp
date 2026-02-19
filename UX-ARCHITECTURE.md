# RNTell First-Time Nurse UX Architecture

## System Overview

```
                    ┌──────────────┐
                    │  Landing Page │
                    │   (public)    │
                    └──────┬───────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
     ┌─────────────┐          ┌──────────────┐
     │  Path A:     │          │  Path B:      │
     │  /analyze    │          │  /jobs        │
     │  (public)    │          │  (public)     │
     └──────┬──────┘          └──────┬────────┘
            │                        │
            │                        ▼
            │               ┌──────────────┐
            │               │  /jobs/[id]   │
            │               │  (public)     │
            │               └──────┬────────┘
            │                      │
            │            ┌─────────┴──────────┐
            │            ▼                    ▼
            │     "Apply" (auth gate)   "Analyze This Job"
            │            │                    │
            │            │                    ▼
            │            │            ┌──────────────┐
            │            │            │  /analyze?    │
            │            │            │  job_id=X     │
            │            │            │  (public)     │
            │            │            └──────┬───────┘
            │            │                   │
            ▼            ▼                   ▼
     ┌─────────────────────────────────────────────┐
     │         Soft Conversion Gate                 │
     │  (blur details, prompt signup)               │
     └──────────────────┬──────────────────────────┘
                        ▼
              ┌──────────────────┐
              │  /signup          │
              │  (preserves       │
              │   return context) │
              └────────┬─────────┘
                       ▼
              ┌──────────────────┐
              │  Onboarding Modal │
              │  (2-step)         │
              └────────┬─────────┘
                       ▼
              ┌──────────────────┐
              │  Nurse Dashboard  │
              │  (first-time)     │
              └──────────────────┘
```

---

## PART 1 — LANDING PAGE (`/`)

### Current State
- Hero: "Know your worth. Find your place. Connect directly."
- CTAs: "I'm a Nurse" / "I'm a Facility" → both go to `/signup`
- Value props: Verified Salary Data, Roaming RN Social, Direct-to-Facility
- Trust: 100% Verified Data, Zero Middleman Fees, Nurse-First Design

### New Design

**Component: `src/app/page.tsx`**

```
┌──────────────────────────────────────────────────┐
│  Navbar: [RNTell] [Find Jobs] [Analyze an Offer] │
│          [Sign In] [Get Started]                  │
├──────────────────────────────────────────────────┤
│                                                    │
│  HERO SECTION                                      │
│  bg: gradient brand-peach-50 → brand-warm          │
│                                                    │
│  Headline: "The Financial Decision Engine          │
│             for Travel Nurses"                     │
│                                                    │
│  Subhead: One sentence on financial clarity.       │
│                                                    │
│  ┌──────────────────┐  ┌───────────────────┐      │
│  │  Analyze My Offer │  │    Find Jobs      │      │
│  │  (primary/orange)  │  │  (outline/orange) │      │
│  │  → /analyze        │  │  → /jobs          │      │
│  └──────────────────┘  └───────────────────┘      │
│                                                    │
├──────────────────────────────────────────────────┤
│                                                    │
│  TRUST ANCHORS (4 icon tiles)                      │
│  bg: brand-mint-50                                 │
│                                                    │
│  [DollarSign]          [ShieldAlert]               │
│  "See your real        "Detect margin              │
│   take-home"            manipulation"              │
│                                                    │
│  [Award]               [Briefcase]                 │
│  "Surface PSLF +       "Apply directly             │
│   federal eligibility"  to facilities"             │
│                                                    │
├──────────────────────────────────────────────────┤
│                                                    │
│  HOW IT WORKS (3-step visual)                      │
│  bg: white                                         │
│                                                    │
│  Step 1:              Step 2:          Step 3:     │
│  [Upload/Enter]  →    [See Analysis] → [Act]       │
│  "Enter your          "Get financial   "Apply      │
│   contract"            breakdown"       direct or  │
│                                         negotiate" │
│                                                    │
├──────────────────────────────────────────────────┤
│                                                    │
│  BOTTOM CTA                                        │
│  bg: brand-warm                                    │
│                                                    │
│  "Ready to see what your contract is really        │
│   worth?"                                          │
│  [Analyze My Offer] (orange, full-width mobile)    │
│                                                    │
└──────────────────────────────────────────────────┘
```

### Component Hierarchy
```
page.tsx (server component)
├── <Navbar />                           (existing, no changes)
├── <HeroSection />                      (inline or extracted)
│   ├── h1 headline
│   ├── p subhead
│   ├── <Link href="/analyze" />         (primary CTA)
│   └── <Link href="/jobs" />            (secondary CTA)
├── <TrustAnchors />                     (4-tile grid)
├── <HowItWorks />                       (3-step horizontal)
└── <BottomCTA />                        (single CTA band)
```

### Changes from Current
| Element | Current | New |
|---------|---------|-----|
| Headline | "Know your worth..." | "The Financial Decision Engine for Travel Nurses" |
| Primary CTA | "I'm a Nurse" → /signup | "Analyze My Offer" → /analyze |
| Secondary CTA | "I'm a Facility" → /signup | "Find Jobs" → /jobs |
| Value props | Salary/Social/Direct | Take-home/Margin/Federal/Direct |
| How it works | (none) | 3-step visual flow |
| Bottom CTA | (none) | Repeat primary CTA |

### DB Writes: None
### Auth Required: No

---

## PART 2 — PATH A: ANALYZE AN OFFER (`/analyze`)

### Current State
The analyze flow already exists and is fully functional:
- Tab switcher: Manual Entry / Upload PDF
- Full contract form with 4 layers
- Results display with margin gap, alerts, stipend comparison, bill rate, federal incentives
- Tax context form + audit risk score
- CTA banner to signup with session_id

### Flow Diagram

```
/analyze
  │
  ├─ From landing page:  /analyze
  ├─ From job detail:    /analyze?job_id=X
  │
  ▼
Step 1: INPUT
  │
  ├─ Tab: "Manual Entry"
  │   └─ ContractForm (all fields editable)
  │
  ├─ Tab: "Upload PDF"
  │   └─ PdfDropZone → parsePdfContract()
  │       └─ On success: populate ContractForm fields
  │
  ├─ If job_id query param present:
  │   └─ Pre-populate from job_postings data
  │       (facility_name, city, state, specialty,
  │        hourly_rate, stipend_housing, stipend_meals,
  │        contract_weeks, shift_type)
  │
  ▼
  [Analyze My Offer] button
  │
  ▼
Step 2: ANALYSIS (server action: analyzeContract)
  │
  ├─ Generates session_id cookie if not logged in
  ├─ Saves to contract_analyses table
  │
  ▼
Step 3: RESULTS DISPLAY
  │
  ├─ Margin Gap Headline (green/amber/red)
  ├─ Alert Cards (wage rechar., reimb. taxability, hours flag)
  ├─ Section: Taxable Income
  ├─ Section: Stipends (vs GSA, optimization gap)
  ├─ Section: Contract Terms
  ├─ Bill Rate Estimate
  ├─ Federal Incentive Card          ← VISIBLE (full, unblurred)
  │   ├─ PSLF eligibility + confidence
  │   ├─ HRSA/HPSA eligibility
  │   └─ Federal Strength Score bar
  ├─ Tax Context Form → Audit Risk Score
  │
  ▼
Step 4: SOFT CONVERSION GATE
  │
  ├── VISIBLE (no auth):
  │   ├─ Margin gap headline + severity
  │   ├─ High-level weekly package total
  │   ├─ Alert cards (wage risk, reimb. taxability)
  │   ├─ Federal Incentive Card (full)
  │   ├─ Tax Context Form + Audit Risk
  │   └─ GSA source attribution
  │
  ├── BLURRED (requires auth):
  │   ├─ Detailed stipend optimization suggestions
  │   ├─ Negotiation lever data for this facility
  │   ├─ "Save this analysis" action
  │   ├─ "Compare to other offers" action
  │   └─ "Apply to this job" action (if from job_id)
  │
  └── CTA BANNER:
      ├─ "Save this analysis + unlock job matching"
      ├─ [Create Free Account] → /signup?from=analyze&session_id=X
      └─ [Sign In] → /login?from=analyze&session_id=X
```

### New: Pre-populate from Job Posting

When arriving at `/analyze?job_id=X`:

```
Decision Tree:
  1. Read job_id from searchParams
  2. Fetch job_postings row by id (public, no auth)
  3. Map fields to ContractFormData:
     - facility_name ← job.facility_name (joined)
     - city ← job.city (from facilities)
     - state ← job.state (from facilities)
     - specialty ← job.specialty
     - hourly_rate ← job.hourly_rate
     - stipend_housing ← job.housing_stipend
     - stipend_meals ← job.meals_stipend
     - contract_weeks ← job.contract_weeks
     - shift_type ← job.shift_type
  4. Show "Pre-filled from job listing" banner (like PDF extraction banner)
  5. User can edit any field before analyzing
```

### Component Changes
```
AnalyzeClient.tsx
├── New prop: initialJobData?: Partial<ContractFormData>
├── New state: prefilled (boolean) — shows "Pre-filled from job listing" banner
├── Existing: tab, form, result, auditRisk, error, loading states
│
analyze/page.tsx (server component)
├── Read searchParams.job_id
├── If present: fetch job data, map to ContractFormData shape
└── Pass as prop to <AnalyzeClient initialJobData={...} />
```

### Blurred Content Implementation

```
ResultsDisplay
├── All current content renders as-is (VISIBLE)
│
├── NEW: <LockedSection> wrapper
│   ├── CSS: blur(4px) + pointer-events-none on children
│   ├── Overlay: semi-transparent card with lock icon
│   │   ├── "Unlock full analysis"
│   │   ├── Bullet list of what's behind the blur:
│   │   │   ├── "Optimization suggestions"
│   │   │   ├── "Facility negotiation levers"
│   │   │   ├── "Save & compare analyses"
│   │   │   └── "Apply directly"
│   │   └── [Create Free Account] button
│   └── Content behind blur:
│       ├── <StipendOptimizationDetail /> (expanded suggestions)
│       ├── <NegotiationLevers /> (from negotiation_levers table)
│       └── <ActionButtons /> (save, compare, apply)
│
└── CTA Banner (existing, still shown below)
```

### DB Writes
| Action | Table | Auth Required | When |
|--------|-------|---------------|------|
| `analyzeContract()` | `contract_analyses` | No (uses session_id) | On "Analyze My Offer" click |
| `saveAnalysisTaxContext()` | `contract_analyses` (update) | No (uses session_id) | On "Calculate Audit Risk" click |
| `claimAnalyses()` | `contract_analyses` (update nurse_id) | Yes (post-signup) | After signup, before redirect |

### State Transitions
```
Anonymous User:
  session_id cookie created → analysis saved with session_id, nurse_id=NULL

After Signup:
  claimAnalyses() → UPDATE contract_analyses SET nurse_id=X WHERE session_id=Y AND nurse_id IS NULL
  session cookie cleared
```

---

## PART 3 — PATH B: FIND JOBS (`/jobs` → `/jobs/[id]`)

### Current State
Fully built. Public job board with filters, job cards, matched jobs for logged-in nurses, job detail page with apply flow.

### Flow Diagram

```
/jobs (public)
  │
  ├── Left: PublicJobFilters (sidebar, mobile accordion)
  │   ├── Specialty (checkboxes)
  │   ├── State (select)
  │   ├── Shift type (checkboxes)
  │   ├── Contract length (select)
  │   ├── Min weekly pay (range slider)
  │   ├── Start date window (select)
  │   └── Source filter (all / verified only)
  │
  ├── Right: Job Feed
  │   ├── "Matched for You" section (if logged-in nurse with specialty)
  │   │   └── Top 5 scored matches
  │   ├── Sort dropdown
  │   └── JobCard grid
  │       └── Each card shows:
  │           ├── Weekly package (teal)
  │           ├── Hourly rate (gray)
  │           ├── Specialty, location, shift, weeks
  │           ├── Trust badge
  │           └── beats_market_rate indicator
  │
  └── Empty state: JobAlertForm (email capture)
  │
  ▼
/jobs/[id] (public)
  │
  ├── Left Column:
  │   ├── Title + badges (trust badge, source)
  │   ├── Pay breakdown table
  │   │   ├── Hourly rate
  │   │   ├── Housing stipend
  │   │   ├── Meals stipend
  │   │   └── Weekly package total
  │   ├── Estimated Weekly Net (preview — derived from pay data)
  │   ├── Requirements tags
  │   └── Description
  │
  ├── Right Column (sticky):
  │   └── Apply Card
  │       ├── Weekly package (large)
  │       ├── Location + contract length
  │       ├── [Apply Now] button
  │       └── [Analyze This Job] button      ← NEW
  │
  └── Mobile: sticky bottom apply bar
```

### New: "Analyze This Job" Button

```
Decision Tree:
  User clicks "Analyze This Job" on /jobs/[id]
    │
    ▼
  Navigate to /analyze?job_id=[id]
    │
    ▼
  /analyze page.tsx:
    1. Detect job_id in searchParams
    2. Fetch job posting data (getJobById or new lightweight fetch)
    3. Map job fields → ContractFormData partial
    4. Pass to AnalyzeClient as initialJobData
    │
    ▼
  AnalyzeClient:
    1. Populate form from initialJobData
    2. Show "Pre-filled from job listing — review and adjust" banner
    3. User clicks "Analyze My Offer"
    4. Runs financial engine
    5. Shows full analysis results (same as manual analysis)
    │
    ▼
  Federal Incentive Layer:
    - Shown in analysis results
    - NOT shown on /jobs or /jobs/[id] directly
    - This is financial intelligence, not job metadata
```

### New: "Estimated Weekly Net" on Job Detail

```
Calculation (client-side, no server action):
  weekly_base = hourly_rate * 36
  weekly_stipends = housing_stipend + meals_stipend
  estimated_net = weekly_base + weekly_stipends

Display:
  Small card below pay breakdown:
  "Estimated Weekly Take-Home: ~$X,XXX"
  Footnote: "Based on 36 hrs/week. Analyze this job for full financial breakdown."
```

### Apply Flow (existing, no changes)

```
User clicks "Apply Now" on /jobs/[id]
  │
  ├── If logged in:
  │   └── Open ApplyModal
  │       ├── Cover note textarea
  │       └── [Submit Application]
  │           └── applyToJob({ job_id, cover_note })
  │               └── INSERT INTO applications
  │
  └── If logged out:
      └── Redirect to /signup?from=jobs&job_id=[id]
          │
          ▼
          AuthForm:
            1. Shows context banner: "Sign up to apply"
            2. After signup: claimAnalyses() + redirect to /jobs/[id]
            3. ApplyModal opens automatically (existing behavior)
```

### DB Writes
| Action | Table | Auth Required | When |
|--------|-------|---------------|------|
| `subscribeJobAlert()` | `job_alerts` | No | Email form submission |
| `applyToJob()` | `applications` | Yes | Apply modal submit |
| `analyzeContract()` | `contract_analyses` | No | Via "Analyze This Job" → /analyze |

---

## PART 4 — SIGNUP & ONBOARDING

### Current Auth Flow
- `/signup` with role toggle (nurse/facility)
- Supports `fromAnalyze`, `fromJobs`, `jobId` params
- On signup: sets `user_metadata.role`, calls `claimAnalyses()` if from analyze
- Redirects to appropriate destination

### Post-Signup Onboarding Modal

```
After signup (nurse role only):
  │
  ▼
Redirect to /dashboard
  │
  ▼
Dashboard layout checks:
  profile.onboarding_complete === false (or NULL)
  │
  ▼
Show <OnboardingModal /> (overlay, non-dismissible)

Step 1 of 2: "Tell us about your license"
┌──────────────────────────────────────────┐
│                                          │
│  Step 1 of 2                             │
│  ─────────────────────────────────────── │
│                                          │
│  Specialty *          [Select dropdown]  │
│  Years of experience* [Number input]     │
│  License state *      [Select dropdown]  │
│  Compact license?     [Yes / No toggle]  │
│  Preferred states     [Multi-select]     │
│                                          │
│                           [Continue →]   │
│                                          │
└──────────────────────────────────────────┘

Step 2 of 2: "Employment preferences"
┌──────────────────────────────────────────┐
│                                          │
│  Step 2 of 2                             │
│  ─────────────────────────────────────── │
│                                          │
│  Employment type      [W-2 / 1099]       │
│  preference           toggle             │
│                                          │
│  Brief explanation:                      │
│  "W-2 = employer benefits, PSLF          │
│   eligible. 1099 = higher gross,         │
│   no federal loan programs."             │
│                                          │
│                   [Complete Setup →]      │
│                                          │
└──────────────────────────────────────────┘

On complete:
  1. Server action: saveOnboardingProfile({
       specialty, years_experience, license_state,
       license_compact, preferred_states,
       employment_type_preference
     })
  2. UPDATE nurses SET ... , onboarding_complete = true
  3. Close modal
  4. Dashboard renders with data
```

### Component Hierarchy
```
/dashboard layout.tsx
├── Checks profile.onboarding_complete
├── If false: renders <OnboardingModal />
│   ├── Step 1: <OnboardingStep1 />
│   │   ├── Specialty select (SPECIALTIES constant)
│   │   ├── Years experience (number)
│   │   ├── License state (STATES constant)
│   │   ├── Compact license (boolean toggle)
│   │   └── Preferred states (multi-select, STATES)
│   └── Step 2: <OnboardingStep2 />
│       ├── Employment type toggle (W2 / 1099)
│       └── Explanation text
└── If true: renders normal dashboard content
```

### Redirect Logic After Signup

```
Decision Tree (in AuthForm, post-signup):
  │
  ├── fromAnalyze === true:
  │   1. claimAnalyses()
  │   2. Redirect to /dashboard (onboarding modal will show)
  │   3. After onboarding: dashboard shows claimed analysis in snapshot
  │
  ├── fromJobs === true && jobId exists:
  │   1. claimAnalyses() (may be no-op)
  │   2. Redirect to /jobs/[jobId] (for apply)
  │   3. On next visit to /dashboard: onboarding modal shows
  │
  └── Default (direct signup):
      1. Redirect to /dashboard
      2. Onboarding modal shows immediately
```

### DB Writes
| Action | Table | Auth Required | When |
|--------|-------|---------------|------|
| `signUp()` | `auth.users` + `profiles` (trigger) | N/A | Signup form submit |
| `claimAnalyses()` | `contract_analyses` (update) | Yes | Post-signup, if from analyze |
| `saveOnboardingProfile()` | `nurses` (update) | Yes | Onboarding modal complete |

### State Transitions
```
New signup (nurse):
  profiles.role = 'nurse'
  nurses row created by DB trigger (from handle_new_user)
  nurses.onboarding_complete = false (default)

After onboarding:
  nurses.specialty = X
  nurses.years_experience = X
  nurses.license_state = X
  nurses.license_compact = true/false
  nurses.preferred_states = [...]
  nurses.employment_type_preference = 'W2' | '1099'
  nurses.onboarding_complete = true
```

---

## PART 5 — FIRST-TIME NURSE DASHBOARD

### Current State
- `/dashboard` = Market Snapshot (salary aggregates)
- `/nurse` = My License HQ (passport card + quick actions)

### New: First-Time Dashboard Layout

After onboarding is complete, the nurse dashboard shows contextual content based on what data exists.

```
/nurse (My License HQ — first time)
┌──────────────────────────────────────────────────┐
│                                                    │
│  Section 1: YOUR FINANCIAL SNAPSHOT                │
│  ┌─────────────────────────────────────────────┐  │
│  │                                             │  │
│  │  IF has claimed analysis:                   │  │
│  │    Latest analysis card:                    │  │
│  │    ├── Facility name + location             │  │
│  │    ├── Weekly package                       │  │
│  │    ├── Margin severity badge (green/amber/  │  │
│  │    │   red)                                 │  │
│  │    ├── Federal eligibility flags (if any)   │  │
│  │    └── [View Full Analysis] link            │  │
│  │                                             │  │
│  │  IF no analysis yet:                        │  │
│  │    Empty state:                             │  │
│  │    "No contract analyzed yet"               │  │
│  │    [Analyze Your First Offer] → /analyze    │  │
│  │                                             │  │
│  └─────────────────────────────────────────────┘  │
│                                                    │
│  Section 2: SMART MATCHES                          │
│  ┌─────────────────────────────────────────────┐  │
│  │                                             │  │
│  │  getMatchedJobs() → top 5 scored matches    │  │
│  │  (uses specialty, license_state,            │  │
│  │   preferred_states from onboarding)         │  │
│  │                                             │  │
│  │  Each match card shows:                     │  │
│  │  ├── Job title + facility                   │  │
│  │  ├── Weekly package                         │  │
│  │  ├── Match score (percentage)               │  │
│  │  ├── beats_market_rate badge                │  │
│  │  └── [View Job] → /jobs/[id]               │  │
│  │                                             │  │
│  │  IF no matches:                             │  │
│  │    "No matches yet — more jobs added daily" │  │
│  │    [Browse All Jobs] → /jobs                │  │
│  │                                             │  │
│  └─────────────────────────────────────────────┘  │
│                                                    │
│  Section 3: OPTIMIZE YOUR EARNINGS                 │
│  ┌─────────────────────────────────────────────┐  │
│  │                                             │  │
│  │  3 action cards:                            │  │
│  │                                             │  │
│  │  [GSA Gaps]                                 │  │
│  │  "Check if your stipends match GSA rates"   │  │
│  │  → /analyze                                 │  │
│  │                                             │  │
│  │  [Market Value]                             │  │
│  │  "See how your pay compares"                │  │
│  │  → /nurse/pay-intelligence                  │  │
│  │                                             │  │
│  │  [Federal Incentives]                       │  │
│  │  "Check PSLF + HRSA eligibility"            │  │
│  │  → /analyze (with note: analyze a contract  │  │
│  │    to check federal eligibility)            │  │
│  │                                             │  │
│  └─────────────────────────────────────────────┘  │
│                                                    │
└──────────────────────────────────────────────────┘
```

### Component Hierarchy
```
/nurse/page.tsx (server component)
├── Fetch: user, profile, nurse data
├── Fetch: latest contract_analyses WHERE nurse_id = user.id (LIMIT 1, ORDER BY created_at DESC)
├── Fetch: getMatchedJobs()
│
├── <FinancialSnapshot analysis={latestAnalysis} />
│   ├── If analysis: summary card with key metrics
│   └── If null: empty state with CTA
│
├── <SmartMatches matches={matchedJobs} />
│   ├── If matches: horizontal scroll of match cards
│   └── If empty: browse all CTA
│
└── <OptimizeEarnings />
    ├── GSA Gaps card → /analyze
    ├── Market Value card → /nurse/pay-intelligence
    └── Federal Incentives card → /analyze
```

### Data Sources (all existing)
| Data | Source | Auth Required |
|------|--------|---------------|
| Latest analysis | `contract_analyses` WHERE nurse_id = X | Yes |
| Smart matches | `getMatchedJobs()` (existing action) | Yes |
| Federal flags | Derived from latest analysis result | Yes |

---

## PART 6 — INCENTIVE LAYER PLACEMENT

### Architecture Decision

Federal incentives are **financial intelligence**, not job metadata.

```
WHERE incentives are computed:
  src/lib/federal-incentives/engine.ts
    └── analyzeFederalIncentives(input)
        ├── Input: facility_name, facility_ein, facility_zip, employment_type
        ├── Calls: classifyEmployer() → PSLF eligibility
        ├── Calls: lookupHpsa() → HRSA eligibility
        └── Returns: FederalIncentiveLayer

WHERE incentives are stored:
  contract_analyses.analysis_result (JSONB)
    └── federal_incentive_layer: {
          pslf: { eligible, confidence_score, employer_type, notes },
          hrsa: { potentially_eligible, hpsa_type, hpsa_score, notes },
          federal_strength_score: number,
          federal_opportunity_flag: boolean
        }

WHERE incentives are NOT stored:
  ✗ job_postings table
  ✗ facilities table
  ✗ Any static/cached location
```

### Display Rules

| Location | Federal Incentives Shown? | Detail Level |
|----------|--------------------------|--------------|
| Landing page (`/`) | No | N/A |
| Job board (`/jobs`) | No | N/A |
| Job detail (`/jobs/[id]`) | No | N/A |
| Analysis results (`/analyze`) | Yes | Full card with PSLF, HRSA, score bar |
| Dashboard snapshot (`/nurse`) | Badge only | "PSLF Eligible" / "HPSA Area" flags |
| Analysis history (future) | Summary | Score + flags per analysis |

### Recomputation Rules

Incentives are recomputed on every `analyzeContract()` call because:
- Employment type can change (W2 vs 1099)
- Facility classification depends on name/EIN matching
- HPSA lookup depends on facility ZIP
- None of these are static properties of the job

---

## PART 7 — COMPLETE DECISION TREE

```
User arrives at /
  │
  ├── Clicks "Analyze My Offer"
  │   └── → /analyze (public, no auth)
  │       ├── Enter/upload contract data
  │       ├── Click "Analyze My Offer"
  │       ├── See full results (margin, alerts, federal incentives, audit risk)
  │       ├── Blurred: optimization suggestions, save, apply
  │       └── Click "Create Free Account"
  │           └── → /signup?from=analyze&session_id=X
  │               ├── Signup (role=nurse)
  │               ├── claimAnalyses() runs
  │               ├── → /dashboard
  │               ├── OnboardingModal shows (2 steps)
  │               ├── Complete onboarding
  │               └── Dashboard renders with claimed analysis + smart matches
  │
  ├── Clicks "Find Jobs"
  │   └── → /jobs (public, no auth)
  │       ├── Browse and filter jobs
  │       ├── Click a job → /jobs/[id]
  │       │   ├── See pay breakdown, trust badge, estimated net
  │       │   │
  │       │   ├── Click "Analyze This Job"
  │       │   │   └── → /analyze?job_id=[id]
  │       │   │       ├── Form pre-populated from job data
  │       │   │       ├── User adjusts and submits
  │       │   │       └── (continues as Path A above)
  │       │   │
  │       │   └── Click "Apply Now"
  │       │       ├── If logged in → ApplyModal
  │       │       └── If logged out → /signup?from=jobs&job_id=[id]
  │       │           ├── Signup
  │       │           ├── → /jobs/[id]
  │       │           └── ApplyModal opens
  │       │
  │       └── No results? JobAlertForm (email capture, no auth)
  │
  └── Clicks "Get Started" or "Sign In"
      └── → /signup or /login (standard auth flow)
          └── → /dashboard → OnboardingModal (if new nurse)
```

---

## PART 8 — AUTH GATE MAP

| Page/Action | Auth Required | Gate Type | Redirect |
|-------------|---------------|-----------|----------|
| `/` | No | — | — |
| `/analyze` (input + results) | No | — | — |
| `/analyze` (save analysis) | Yes | Soft (CTA banner) | /signup?from=analyze |
| `/analyze` (optimization details) | Yes | Blur overlay | /signup?from=analyze |
| `/jobs` | No | — | — |
| `/jobs/[id]` | No | — | — |
| `/jobs/[id]` → Apply | Yes | Hard redirect | /signup?from=jobs&job_id=X |
| `/jobs/[id]` → "Analyze This Job" | No | — | → /analyze?job_id=X |
| `/dashboard/*` | Yes | Hard redirect | /login |
| `/nurse/*` | Yes | Hard redirect | /login |
| Job alert email signup | No | — | — |

---

## PART 9 — EMOTIONAL FLOW

```
PHASE 1: CURIOSITY
  Landing page → "What is my contract really worth?"
  Entry: low-friction, no signup required
  Emotion: intrigue, slight anxiety about being underpaid

PHASE 2: CLARITY
  Analysis results → financial breakdown appears
  "This is what I actually take home"
  Emotion: surprise (often downward), relief at understanding

PHASE 3: FINANCIAL INSIGHT
  Federal incentive card + audit risk
  "There's margin risk here" / "This employer qualifies for PSLF"
  "I didn't know I could get loan forgiveness at this facility"
  Emotion: empowerment through information asymmetry reversal

PHASE 4: ACTIVATION
  Blurred premium content + CTA
  "I should save this" / "I want to see the negotiation levers"
  Emotion: desire to act on new knowledge
  → Account creation feels like unlocking, not gating

PHASE 5: OWNERSHIP
  Post-signup dashboard with personalized data
  "These jobs are matched to ME" / "My financial snapshot"
  Emotion: control, agency, professional identity
```

---

## PART 10 — EDGE CASES

### Facility Classification Unknown
```
Federal Incentive Card shows:
  PSLF section:
    Badge: "Undetermined" (gray)
    Notes: "Employer type could not be determined from available data.
            Verify nonprofit/public status with the facility's HR department."
    Confidence: 0%

  Impact: federal_strength_score reduced (no PSLF points)
  Display: Card still renders, but without "Opportunity Detected" badge
```

### 1099 Employment Type
```
Federal Incentive Card shows:
  PSLF section:
    Badge: "Not Eligible" (gray)
    Notes: "1099 independent contractor arrangements are not eligible
            for Public Service Loan Forgiveness."

  HRSA section:
    Badge: "Not Eligible" (gray)
    Notes: "Federal loan repayment programs typically require W-2
            employment."

  Impact: federal_strength_score = 0
  Display: Card renders with note about W-2 requirement
```

### No HPSA Designation
```
HRSA section:
  Badge: "Not Eligible" (gray)
  Notes: "No federal health professional shortage designation detected
          for this facility location."
  HPSA Type: (not shown)
```

### Job with Missing Pay Data
```
If job_postings row has NULL hourly_rate:
  "Analyze This Job" button still works
  ContractForm shows with empty rate field (required)
  User must enter rate manually before analysis
```

### User Abandons Onboarding
```
If user closes tab during onboarding:
  nurses.onboarding_complete remains false
  On next login → /dashboard → modal reappears
  No data lost — modal is idempotent
```

### User Comes from /analyze, Signs Up, Then Visits /jobs/[id] to Apply
```
  1. Analysis claimed during signup (claimAnalyses runs)
  2. Redirect to /dashboard (onboarding modal)
  3. User completes onboarding
  4. User navigates to /jobs/[id] manually
  5. Apply works normally (user is now authenticated)
  6. Onboarding data enables smart matching
```

---

## PART 11 — NEW FILES & CHANGES SUMMARY

### New Files
| File | Purpose |
|------|---------|
| `src/components/onboarding/OnboardingModal.tsx` | 2-step onboarding overlay |
| `src/app/actions/onboarding.ts` | `saveOnboardingProfile()` server action |

### Modified Files
| File | Changes |
|------|---------|
| `src/app/page.tsx` | New hero, CTAs, trust anchors, how-it-works |
| `src/app/analyze/page.tsx` | Add job_id param reading + data fetch |
| `src/app/analyze/AnalyzeClient.tsx` | Add initialJobData prop, pre-fill banner, blur section |
| `src/app/jobs/[id]/JobDetailClient.tsx` | Add "Analyze This Job" button, estimated net card |
| `src/app/(dashboard)/layout.tsx` | Check onboarding_complete, render OnboardingModal |
| `src/app/(dashboard)/nurse/page.tsx` | New first-time layout (snapshot, matches, optimize) |

### Database Changes Required
| Change | Type |
|--------|------|
| `nurses.onboarding_complete` (boolean, default false) | New column |
| `nurses.employment_type_preference` (text) | New column |
| `nurses.preferred_states` (text[] or jsonb) | New column (if not already present) |

### No Changes To
- Auth flow (existing `fromAnalyze`/`fromJobs`/`jobId` params work)
- `claimAnalyses()` (already handles session → nurse transfer)
- Federal incentive engine (pure functions, no changes)
- Job board filtering/sorting
- Apply flow
- Sidebar navigation
- Admin portal
- RLS policies
- Schema beyond the 3 columns above
