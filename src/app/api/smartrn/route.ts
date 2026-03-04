/**
 * POST /api/smartrn
 * -----------------
 * SmartRN RAG chat: embeds user query, retrieves matching KB answers,
 * then generates a grounded response via Gemini chat.
 *
 * Body: { query: string, history: { role: "user"|"model", content: string }[] }
 * Returns: { answer: string, sources: { question: string, answer_snippet: string, confidence: number }[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const SYSTEM_PROMPT = `You are SmartRN, an AI assistant built by RNTell that empowers travel nurses with real, community-sourced knowledge.

Your voice:
- Direct, supportive, and pro-nurse. You exist to help nurses negotiate better, earn more, and avoid being taken advantage of.
- Recruiterless: NEVER recommend staffing agencies, recruiters, or middlemen. Always advocate for direct-to-facility hiring, self-advocacy, and transparency.
- Ground your answers in the retrieved community data below. If the data doesn't cover the question, say so honestly rather than making things up.

When answering:
- Be concise but thorough. Use bullet points for lists.
- If pay rates or stipends are mentioned, always note these are community-reported and may vary.
- Encourage nurses to verify specifics with the facility directly.
- If you reference a specific community answer, mention it naturally (e.g., "Based on what nurses have reported...").`;

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

  // Build contents array: system instruction via first user turn, then history, then current query
  const contents: { role: string; parts: { text: string }[] }[] = [];

  // Add conversation history
  for (const msg of history) {
    contents.push({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    });
  }

  // Current user query with retrieved context
  contents.push({
    role: "user",
    parts: [
      {
        text: `Retrieved community knowledge:\n${context}\n\nNurse's question: ${query}`,
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

    // 1. Embed the query
    const embedding = await embedQuery(query.trim());
    if (embedding.length === 0) {
      return NextResponse.json(
        { error: "Failed to generate embedding" },
        { status: 500 }
      );
    }

    // 2. Retrieve matching KB answers
    const supabase = await createClient();
    const { data: matches, error: rpcError } = await supabase.rpc(
      "match_kb_answers",
      {
        query_embedding: JSON.stringify(embedding),
        match_threshold: 0.3,
        match_count: 5,
      }
    );

    if (rpcError) {
      console.error("match_kb_answers RPC error:", rpcError);
      return NextResponse.json(
        { error: "Knowledge base search failed" },
        { status: 500 }
      );
    }

    const kbMatches = (matches ?? []) as KBMatch[];

    // 3. Build context from retrieved answers
    const context =
      kbMatches.length > 0
        ? kbMatches
            .map((m, i) => {
              const qLabel = m.question_text
                ? `Q: ${m.question_text}\n`
                : "";
              return `[${i + 1}] ${qLabel}A: ${m.answer_text}\n(confidence: ${m.confidence}, relevance: ${m.similarity.toFixed(3)})`;
            })
            .join("\n\n")
        : "No matching community knowledge found for this question.";

    // 4. Generate response
    const answer = await generateChat(context, history, query.trim());

    // 5. Build sources
    const sources = kbMatches.map((m) => ({
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
