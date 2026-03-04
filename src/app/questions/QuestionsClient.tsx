"use client";

import Link from "next/link";
import { MessageCircle, ArrowRight, Search, Sparkles } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import type { PublicQuestion } from "@/app/actions/questions";
import { CATEGORY_LABELS, CATEGORIES } from "@/lib/question-categories";

export function QuestionsClient({
  questions,
  total,
  isLoggedIn,
  currentCategory,
  currentSearch,
}: {
  questions: PublicQuestion[];
  total: number;
  isLoggedIn: boolean;
  currentCategory: string;
  currentSearch: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleCategoryChange(category: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (category) {
      params.set("category", category);
    } else {
      params.delete("category");
    }
    router.push(`/questions?${params.toString()}`);
  }

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const search = (form.elements.namedItem("search") as HTMLInputElement).value;
    const params = new URLSearchParams(searchParams.toString());
    if (search) {
      params.set("search", search);
    } else {
      params.delete("search");
    }
    router.push(`/questions?${params.toString()}`);
  }

  return (
    <div className="min-h-screen bg-brand-warm">
      {/* Header — matches jobs page exactly */}
      <header className="border-b border-brand-gray-200 bg-white">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/" className="text-xl font-bold text-brand-orange">
            RNTell
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/jobs"
              className="text-sm font-medium text-brand-gray-500 hover:text-brand-charcoal"
            >
              Find Jobs
            </Link>
            <Link
              href="/questions"
              className="text-sm font-medium text-brand-charcoal"
            >
              Q&A
            </Link>
            <Link
              href="/analyze"
              className="text-sm font-medium text-brand-gray-500 hover:text-brand-charcoal"
            >
              Analyze an Offer
            </Link>
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="rounded-lg bg-brand-orange px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-brand-orange-hover"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-brand-charcoal transition-colors hover:bg-brand-gray-100"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="rounded-lg bg-brand-orange px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-brand-orange-hover"
                >
                  Get Started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <div className="container py-6">
        {/* Page title + CTA */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-brand-charcoal">
              <MessageCircle className="text-brand-orange" size={28} />
              Travel Nurse Q&A
            </h1>
            <p className="mt-1 text-sm text-brand-gray-500">
              Real answers from the travel nursing community — verified against market data.
            </p>
          </div>
          <Link
            href={isLoggedIn ? "/smartrn" : "/signup?from=questions"}
            className="shrink-0 flex items-center gap-2 rounded-lg bg-brand-orange px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-orange-hover"
          >
            <Sparkles size={16} />
            Get Verified Answers
          </Link>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="relative max-w-xl">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray-400"
              size={16}
            />
            <input
              name="search"
              defaultValue={currentSearch}
              placeholder="Search questions..."
              className="w-full rounded-lg border border-brand-gray-200 bg-white py-2 pl-9 pr-4 text-sm focus:border-brand-orange focus:ring-1 focus:ring-brand-orange focus:outline-none"
            />
          </div>
        </form>

        {/* Two-column layout */}
        <div className="flex gap-6">
          {/* Left: category filter */}
          <aside className="hidden w-64 shrink-0 lg:block">
            <div className="sticky top-6 rounded-xl border border-brand-gray-200 bg-white p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-gray-500">
                Filter by Category
              </p>
              <ul className="space-y-1">
                <li>
                  <button
                    onClick={() => handleCategoryChange("")}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      !currentCategory
                        ? "bg-brand-orange text-white font-semibold"
                        : "text-brand-charcoal hover:bg-brand-gray-100"
                    }`}
                  >
                    All Categories
                  </button>
                </li>
                {CATEGORIES.map((cat) => (
                  <li key={cat.value}>
                    <button
                      onClick={() => handleCategoryChange(cat.value)}
                      className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        currentCategory === cat.value
                          ? "bg-brand-orange text-white font-semibold"
                          : "text-brand-charcoal hover:bg-brand-gray-100"
                      }`}
                    >
                      {cat.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* Right: question feed */}
          <div className="min-w-0 flex-1">
            <div className="mb-4">
              <p className="text-sm text-brand-gray-500">
                <span className="font-semibold text-brand-charcoal">{total}</span>{" "}
                {total === 1 ? "question" : "questions"}
                {currentCategory ? ` in ${CATEGORY_LABELS[currentCategory]}` : ""}
              </p>
            </div>

            {questions.length === 0 ? (
              <div className="rounded-xl border border-brand-gray-200 bg-white p-12 text-center">
                <MessageCircle className="mx-auto text-brand-gray-300" size={48} />
                <h2 className="mt-4 text-lg font-semibold text-brand-charcoal">
                  No questions found
                </h2>
                <p className="mx-auto mt-2 max-w-sm text-sm text-brand-gray-500">
                  Try a different category or search term.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {questions.map((q) => (
                  <div
                    key={q.id}
                    className="rounded-xl border border-brand-gray-200 bg-white p-5 transition-shadow hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <h2 className="text-base font-semibold text-brand-charcoal leading-snug">
                          {q.question_text}
                        </h2>
                        <p className="mt-2 text-sm text-brand-gray-500 leading-relaxed">
                          {q.answer_excerpt}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {q.category && (
                            <span className="rounded-full bg-brand-orange/10 px-2.5 py-0.5 text-xs font-medium text-brand-orange">
                              {CATEGORY_LABELS[q.category] ?? q.category}
                            </span>
                          )}
                          {q.topics.slice(0, 4).map((topic) => (
                            <span
                              key={topic}
                              className="rounded-full bg-brand-gray-100 px-2.5 py-0.5 text-xs text-brand-gray-500"
                            >
                              {topic.replace(/_/g, " ")}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="shrink-0">
                        {isLoggedIn ? (
                          <button className="flex flex-col items-center rounded-lg border border-brand-gray-200 px-3 py-2 text-brand-gray-400 hover:border-brand-orange hover:text-brand-orange transition-colors">
                            <span className="text-lg leading-none">▲</span>
                            <span className="text-xs mt-0.5">Vote</span>
                          </button>
                        ) : (
                          <Link
                            href="/login?from=questions"
                            className="flex flex-col items-center rounded-lg border border-brand-gray-200 px-3 py-2 text-brand-gray-400 hover:border-brand-orange hover:text-brand-orange transition-colors"
                          >
                            <span className="text-lg leading-none">▲</span>
                            <span className="text-xs mt-0.5">Vote</span>
                          </Link>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-brand-gray-100 pt-3">
                      <p className="text-xs text-brand-gray-400">
                        {new Date(q.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                      <Link
                        href={isLoggedIn ? "/smartrn" : "/signup?from=questions"}
                        className="flex items-center gap-1 text-xs font-medium text-brand-orange hover:text-brand-orange-hover"
                      >
                        <Sparkles size={12} />
                        Get a verified answer
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
