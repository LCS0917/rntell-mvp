/**
 * POST /api/smartrn
 * -----------------
 * SmartRN RAG chat: embeds user query, retrieves matching KB answers
 * AND real salary/job data, then generates a grounded response via Gemini.
 *
 * Body: { query: string, history: { role: "user"|"model", content: string }[] }
 * Returns: { answer: string, sources: { question: string, answer_snippet: string, confidence: number }[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const SYSTEM_PROMPT = `You are SmartRN, an AI assistant built by RNTell that empowers travel nurses with real, community-sourced knowledge and actual rate data from nurse-reported salaries.

Your voice:
- Direct, supportive, and pro-nurse. You exist to help nurses negotiate better, earn more, and avoid being taken advantage of.
- Recruiterless: NEVER recommend staffing agencies, recruiters, or middlemen. Always advocate for direct-to-facility hiring, self-advocacy, and transparency.
- Ground your answers in the retrieved data below. Prioritize REAL RATE DATA over general advice.

When answering about pay/rates:
- ALWAYS lead with specific numbers from the rate data if available (hourly rates, stipends, weekly totals).
- Present rate ranges (low to high) and averages when multiple data points exist.
- Break down the pay package: hourly rate, housing stipend, meal stipend, total weekly.
- Flag margin risk if the data shows it (weekly pay below $2,000 GSA benchmark).
- Note the sample size so nurses know how much data backs the numbers.

When answering general questions:
- Be concise. Use bullet points.
- If community knowledge provides useful context, weave it in naturally.
- If data is limited, say so honestly and suggest checking the RNTell Pay Database for more.
- Encourage nurses to verify specifics with the facility directly.`;

interface ChatMessage {
  role: "user" | "model";
  content: string;
}

interface KBMatch {
  id: string;
  answer_text: string;
  confidence: number;
  is_canonical: boolean;
  question_text: string | null;
  similarity: number;
}

interface SalaryRow {
  hourly_rate: number;
  stipend_housing: number;
  stipend_meals: number;
  shift_type: string | null;
  specialty: string | null;
  margin_risk_detected: boolean;
  reported_at: string;
  facilities: {
    name: string;
    location_city: string | null;
    location_state: string | null;
  } | null;
}

interface JobRow {
  title: string;
  specialty: string | null;
  pay_rate_hourly: number | null;
  pay_package_total: number | null;
  stipend_housing: number | null;
  stipend_meals: number | null;
  shift_type: string | null;
  hours_per_week: number | null;
  facilities: {
    name: string;
    location_city: string | null;
    location_state: string | null;
  } | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SPECIALTIES_MAP: Record<string, string> = {
  icu: "ICU", "intensive care": "ICU",
  er: "ER", "emergency": "ER", "emergency room": "ER",
  "med-surg": "Med-Surg", "med surg": "Med-Surg", "medsurg": "Med-Surg",
  "l&d": "L&D", "labor and delivery": "L&D", "labor & delivery": "L&D",
  nicu: "NICU",
  or: "OR", "operating room": "OR",
  tele: "Tele", "telemetry": "Tele",
  pcu: "PCU", "progressive care": "PCU",
  pacu: "PACU",
  stepdown: "Stepdown", "step-down": "Stepdown",
  psych: "Psych", "psychiatric": "Psych",
  rehab: "Rehab", "rehabilitation": "Rehab",
};

const STATES_MAP: Record<string, string> = {
  alabama: "AL", al: "AL", alaska: "AK", ak: "AK", arizona: "AZ", az: "AZ",
  arkansas: "AR", ar: "AR", california: "CA", ca: "CA", colorado: "CO", co: "CO",
  connecticut: "CT", ct: "CT", delaware: "DE", de: "DE", florida: "FL", fl: "FL",
  georgia: "GA", ga: "GA", hawaii: "HI", hi: "HI", idaho: "ID",
  illinois: "IL", il: "IL", indiana: "IN", iowa: "IA", ia: "IA",
  kansas: "KS", ks: "KS", kentucky: "KY", ky: "KY", louisiana: "LA", la: "LA",
  maine: "ME", me: "ME", maryland: "MD", md: "MD", massachusetts: "MA", ma: "MA",
  michigan: "MI", mi: "MI", minnesota: "MN", mn: "MN", mississippi: "MS", ms: "MS",
  missouri: "MO", mo: "MO", montana: "MT", mt: "MT", nebraska: "NE", ne: "NE",
  nevada: "NV", nv: "NV", "new hampshire": "NH", nh: "NH", "new jersey": "NJ", nj: "NJ",
  "new mexico": "NM", nm: "NM", "new york": "NY", ny: "NY", "north carolina": "NC", nc: "NC",
  "north dakota": "ND", nd: "ND", ohio: "OH", oh: "OH", oklahoma: "OK", ok: "OK",
  oregon: "OR", pennsylvania: "PA", pa: "PA", "rhode island": "RI", ri: "RI",
  "south carolina": "SC", sc: "SC", "south dakota": "SD", sd: "SD",
  tennessee: "TN", tn: "TN", texas: "TX", tx: "TX", utah: "UT", ut: "UT",
  vermont: "VT", vt: "VT", virginia: "VA", va: "VA", washington: "WA", wa: "WA",
  "west virginia": "WV", wv: "WV", wisconsin: "WI", wi: "WI", wyoming: "WY", wy: "WY",
};

const SHIFT_MAP: Record<string, string> = {
  day: "day", days: "day", "day shift": "day",
  night: "night", nights: "night", "night shift": "night", noc: "night", nocs: "night",
  rotating: "rotating",
  prn: "prn",
};

function extractFilters(query: string): {
  specialty: string | null;
  state: string | null;
  shift: string | null;
} {
  const lower = query.toLowerCase();

  // Extract specialty (longest match first)
  let specialty: string | null = null;
  const specialtyKeys = Object.keys(SPECIALTIES_MAP).sort((a, b) => b.length - a.length);
  for (const key of specialtyKeys) {
    if (lower.includes(key)) {
      specialty = SPECIALTIES_MAP[key];
      break;
    }
  }

  // Extract state (longest match first)
  let state: string | null = null;
  const stateKeys = Object.keys(STATES_MAP).sort((a, b) => b.length - a.length);
  for (const key of stateKeys) {
    // Use word boundary check for short codes to avoid false matches
    if (key.length <= 2) {
      const regex = new RegExp(`\\b${key}\\b`, "i");
      if (regex.test(lower)) {
        state = STATES_MAP[key];
        break;
      }
    } else if (lower.includes(key)) {
      state = STATES_MAP[key];
      break;
    }
  }

  // Extract shift
  let shift: string | null = null;
  const shiftKeys = Object.keys(SHIFT_MAP).sort((a, b) => b.length - a.length);
  for (const key of shiftKeys) {
    if (lower.includes(key)) {
      shift = SHIFT_MAP[key];
      break;
    }
  }

  return { specialty, state, shift };
}

// ---------------------------------------------------------------------------
// Gemini calls
// ---------------------------------------------------------------------------

async function embedQuery(query: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "models/gemini-embedding-001",
        content: { parts: [{ text: query }] },
        taskType: "RETRIEVAL_QUERY",
      }),
      signal: AbortSignal.timeout(10000),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Embedding API ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  return data?.embedding?.values ?? [];
}

async function generateChat(
  context: string,
  history: ChatMessage[],
  query: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const contents: { role: string; parts: { text: string }[] }[] = [];

  for (const msg of history) {
    contents.push({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    });
  }

  contents.push({
    role: "user",
    parts: [
      {
        text: `Retrieved data:\n${context}\n\nNurse's question: ${query}`,
      },
    ],
  });

  const payload = {
    system_instruction: {
      parts: [{ text: SYSTEM_PROMPT }],
    },
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
    },
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Chat API ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "I wasn't able to generate a response. Please try again.";
}

// ---------------------------------------------------------------------------
// Rate data helpers
// ---------------------------------------------------------------------------

function buildSalaryContext(rows: SalaryRow[], filters: { specialty: string | null; state: string | null; shift: string | null }): string {
  if (rows.length === 0) return "";

  const hourlyRates = rows.map((r) => Number(r.hourly_rate));
  const weeklyTotals = rows.map((r) => Number(r.hourly_rate) * 36 + Number(r.stipend_housing) + Number(r.stipend_meals));
  const housingStipends = rows.map((r) => Number(r.stipend_housing));
  const mealStipends = rows.map((r) => Number(r.stipend_meals));
  const marginRiskCount = rows.filter((r) => r.margin_risk_detected).length;

  const avg = (arr: number[]) => (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2);
  const min = (arr: number[]) => Math.min(...arr).toFixed(2);
  const max = (arr: number[]) => Math.max(...arr).toFixed(2);

  const filterDesc = [
    filters.specialty,
    filters.shift ? `${filters.shift} shift` : null,
    filters.state,
  ].filter(Boolean).join(", ");

  let text = `=== REAL SALARY DATA (${rows.length} nurse-reported entries${filterDesc ? ` for ${filterDesc}` : ""}) ===\n`;
  text += `Hourly Rate: $${min(hourlyRates)} – $${max(hourlyRates)} (avg $${avg(hourlyRates)})\n`;
  text += `Weekly Housing Stipend: $${min(housingStipends)} – $${max(housingStipends)} (avg $${avg(housingStipends)})\n`;
  text += `Weekly Meal Stipend: $${min(mealStipends)} – $${max(mealStipends)} (avg $${avg(mealStipends)})\n`;
  text += `Total Weekly Package: $${min(weeklyTotals)} – $${max(weeklyTotals)} (avg $${avg(weeklyTotals)})\n`;
  if (marginRiskCount > 0) {
    text += `⚠ ${marginRiskCount}/${rows.length} reports flagged as high margin risk (weekly < $2,000 GSA benchmark)\n`;
  }

  // Include individual entries (up to 8) for detail
  text += `\nIndividual reports:\n`;
  rows.slice(0, 8).forEach((r, i) => {
    const weekly = Number(r.hourly_rate) * 36 + Number(r.stipend_housing) + Number(r.stipend_meals);
    const facility = r.facilities ? `${r.facilities.name} (${r.facilities.location_city}, ${r.facilities.location_state})` : "Unknown facility";
    text += `  ${i + 1}. ${facility}: $${r.hourly_rate}/hr + $${r.stipend_housing} housing + $${r.stipend_meals} meals = $${weekly.toFixed(0)}/wk`;
    if (r.shift_type) text += ` [${r.shift_type}]`;
    if (r.specialty) text += ` [${r.specialty}]`;
    text += `\n`;
  });

  return text;
}

function buildJobContext(rows: JobRow[]): string {
  if (rows.length === 0) return "";

  const withPay = rows.filter((r) => r.pay_rate_hourly || r.pay_package_total);
  if (withPay.length === 0) return "";

  let text = `\n=== CURRENT JOB POSTINGS (${withPay.length} matching listings) ===\n`;
  withPay.slice(0, 5).forEach((j, i) => {
    const facility = j.facilities ? `${j.facilities.name} (${j.facilities.location_city}, ${j.facilities.location_state})` : "Unknown";
    text += `  ${i + 1}. ${j.title} at ${facility}`;
    if (j.pay_rate_hourly) text += ` — $${j.pay_rate_hourly}/hr`;
    if (j.pay_package_total) text += `, $${j.pay_package_total}/wk total`;
    if (j.shift_type) text += ` [${j.shift_type}]`;
    text += `\n`;
  });

  return text;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, history = [] } = body as {
      query: string;
      history: ChatMessage[];
    };

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const trimmedQuery = query.trim();

    // 1. Extract specialty/state/shift from query
    const filters = extractFilters(trimmedQuery);

    // 2. Run all data fetches in parallel
    const [embeddingResult, salaryResult, jobResult] = await Promise.all([
      // KB embedding search
      embedQuery(trimmedQuery).then(async (embedding) => {
        if (embedding.length === 0) return [] as KBMatch[];
        const { data } = await supabase.rpc("match_kb_answers", {
          query_embedding: JSON.stringify(embedding),
          match_threshold: 0.3,
          match_count: 5,
        });
        return (data ?? []) as KBMatch[];
      }),

      // Salary reports query
      (async () => {
        let q = supabase
          .from("salary_reports")
          .select(`
            hourly_rate, stipend_housing, stipend_meals, shift_type,
            specialty, margin_risk_detected, reported_at,
            facilities (name, location_city, location_state)
          `)
          .order("reported_at", { ascending: false })
          .limit(20);

        if (filters.specialty) q = q.ilike("specialty", `%${filters.specialty}%`);
        if (filters.shift) q = q.eq("shift_type", filters.shift);
        // State filter via join — filter out nulls after
        if (filters.state) q = q.ilike("facilities.location_state", `%${filters.state}%`);

        const { data } = await q;
        let rows = (data ?? []) as unknown as SalaryRow[];
        if (filters.state) rows = rows.filter((r) => r.facilities !== null);
        return rows;
      })(),

      // Job postings query
      (async () => {
        let q = supabase
          .from("job_postings")
          .select(`
            title, specialty, pay_rate_hourly, pay_package_total,
            stipend_housing, stipend_meals, shift_type, hours_per_week,
            facilities (name, location_city, location_state)
          `)
          .eq("is_active", true)
          .order("posted_at", { ascending: false })
          .limit(10);

        if (filters.specialty) q = q.ilike("specialty", `%${filters.specialty}%`);
        if (filters.shift) q = q.eq("shift_type", filters.shift);
        if (filters.state) q = q.ilike("facilities.location_state", `%${filters.state}%`);

        const { data } = await q;
        let rows = (data ?? []) as unknown as JobRow[];
        if (filters.state) rows = rows.filter((r) => r.facilities !== null);
        return rows;
      })(),
    ]);

    // 3. Build context
    const salaryContext = buildSalaryContext(salaryResult, filters);
    const jobContext = buildJobContext(jobResult);

    const kbContext =
      embeddingResult.length > 0
        ? "\n=== COMMUNITY KNOWLEDGE ===\n" +
          embeddingResult
            .map((m, i) => {
              const qLabel = m.question_text ? `Q: ${m.question_text}\n` : "";
              return `[${i + 1}] ${qLabel}A: ${m.answer_text}`;
            })
            .join("\n\n")
        : "";

    const fullContext = (salaryContext + jobContext + kbContext) || "No matching data found for this query.";

    // 4. Generate response
    const answer = await generateChat(fullContext, history, trimmedQuery);

    // 5. Build sources
    const sources = embeddingResult.map((m) => ({
      question: m.question_text ?? "Community insight",
      answer_snippet:
        m.answer_text.length > 150
          ? m.answer_text.slice(0, 150) + "…"
          : m.answer_text,
      confidence: Number(m.confidence),
    }));

    return NextResponse.json({ answer, sources });
  } catch (e) {
    console.error("SmartRN error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal error" },
      { status: 500 }
    );
  }
}
