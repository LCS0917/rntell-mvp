import { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import { getPublicQuestions } from "@/app/actions/questions";
import { QuestionsClient } from "./QuestionsClient";
import Footer from "@/components/ui/Footer";

export const metadata: Metadata = {
  title: "Travel Nurse Q&A | RNTell",
  description:
    "Real answers to travel nursing questions — pay, contracts, housing, taxes, licensing, and more.",
};

type Props = {
  searchParams: Promise<Record<string, string | string[]>>;
};

export default async function QuestionsPage({ searchParams }: Props) {
  const params = await searchParams;

  const toString = (v: string | string[] | undefined): string => {
    if (!v) return "";
    return Array.isArray(v) ? v[0] : v;
  };

  const filters = {
    category: toString(params.category) || undefined,
    search: toString(params.search) || undefined,
  };

  const [questionsResult] = await Promise.all([
    getPublicQuestions(filters),
  ]);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <QuestionsClient
        questions={questionsResult.data}
        total={questionsResult.total}
        isLoggedIn={!!user}
        currentCategory={filters.category ?? ""}
        currentSearch={filters.search ?? ""}
      />
      <Footer />
    </>
  );
}
