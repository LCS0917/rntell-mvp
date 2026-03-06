import { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MessageCircle, ArrowLeft, Sparkles } from "lucide-react";
import { CATEGORY_LABELS } from "@/lib/question-categories";
import Footer from "@/components/ui/Footer";
import Navbar from "@/components/ui/Navbar";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("kb_questions")
    .select("question_text")
    .eq("id", id)
    .single();

  return {
    title: data?.question_text
      ? `${data.question_text} | RNTell Q&A`
      : "Travel Nurse Q&A | RNTell",
  };
}

export default async function QuestionDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: question, error } = await supabase
    .from("kb_questions")
    .select(`
      id,
      question_text,
      category,
      topics,
      created_at,
      kb_answers (
        id,
        answer_text,
        confidence
      )
    `)
    .eq("id", id)
    .single();

  if (error || !question) notFound();

  const answer = Array.isArray(question.kb_answers)
    ? question.kb_answers[0]
    : question.kb_answers;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-brand-warm">
      <Navbar />

      <div className="container py-6 max-w-3xl">
        {/* Back */}
        <Link
          href="/questions"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-brand-gray-500 hover:text-brand-charcoal"
        >
          <ArrowLeft size={14} />
          Back to Q&A
        </Link>

        {/* Question */}
        <div className="rounded-xl border border-brand-gray-200 bg-white p-6">
          <div className="mb-4 flex flex-wrap gap-2">
            {question.category && (
              <span className="rounded-full bg-brand-orange/10 px-2.5 py-0.5 text-xs font-medium text-brand-orange">
                {CATEGORY_LABELS[question.category] ?? question.category}
              </span>
            )}
            {(question.topics ?? []).slice(0, 5).map((topic: string) => (
              <span
                key={topic}
                className="rounded-full bg-brand-gray-100 px-2.5 py-0.5 text-xs text-brand-gray-500"
              >
                {topic.replace(/_/g, " ")}
              </span>
            ))}
          </div>

          <h1 className="text-xl font-bold text-brand-charcoal leading-snug">
            {question.question_text}
          </h1>

          <p className="mt-1 text-xs text-brand-gray-400">
            {new Date(question.created_at).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>

          {/* Answer */}
          {answer?.answer_text && (
            <div className="mt-6 border-t border-brand-gray-100 pt-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-gray-400">
                Community Answer
              </p>
              <div className="prose prose-sm max-w-none text-brand-charcoal leading-relaxed whitespace-pre-line">
                {answer.answer_text}
              </div>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="mt-6 rounded-xl border border-brand-orange/20 bg-brand-peach-50 p-6 text-center">
          <p className="text-base font-semibold text-brand-charcoal">
            Want a personalized answer based on your situation?
          </p>
          <p className="mt-1 text-sm text-brand-gray-500">
            SmartRN uses verified nurse data and GSA benchmarks to give you answers tailored to your contract.
          </p>
          <Link
            href={user ? "/nurse/smartrn" : "/signup?from=questions"}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-orange px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-orange-hover"
          >
            <Sparkles size={16} />
            Get Verified Answers
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}
