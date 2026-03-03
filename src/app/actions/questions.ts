"use server";

import { createClient } from "@/utils/supabase/server";

export type QuestionCategory =
  | "pay_and_contracts"
  | "agency_vs_direct_hire"
  | "housing_and_stipends"
  | "taxes_and_insurance"
  | "licensing_and_compliance"
  | "facility_reviews"
  | "getting_started";

export interface PublicQuestion {
  id: string;
  question_text: string;
  answer_excerpt: string;
  answer_text: string;
  category: string;
  topics: string[];
  confidence: number | null;
  created_at: string;
}

export interface QuestionFilters {
  category?: string;
  search?: string;
}

export async function getPublicQuestions(filters: QuestionFilters = {}): Promise<{
  data: PublicQuestion[];
  total: number;
}> {
  const supabase = await createClient();

  let query = supabase
    .from("kb_questions")
    .select(
      `
      id,
      question_text,
      category,
      topics,
      created_at,
      kb_answers!inner (
        id,
        answer_text,
        confidence
      )
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (filters.category) {
    query = query.eq("category", filters.category);
  }

  if (filters.search) {
    query = query.ilike("question_text", `%${filters.search}%`);
  }

  const { data, count, error } = await query.limit(100);

  if (error) {
    console.error("getPublicQuestions error:", error);
    return { data: [], total: 0 };
  }

  const questions: PublicQuestion[] = (data ?? []).map((q: any) => {
    const answer = Array.isArray(q.kb_answers) ? q.kb_answers[0] : q.kb_answers;
    const answerText = answer?.answer_text ?? "";
    return {
      id: q.id,
      question_text: q.question_text,
      answer_text: answerText,
      answer_excerpt: answerText.slice(0, 150) + (answerText.length > 150 ? "..." : ""),
      category: q.category ?? "getting_started",
      topics: q.topics ?? [],
      confidence: answer?.confidence ?? null,
      created_at: q.created_at,
    };
  });

  return { data: questions, total: count ?? 0 };
}
