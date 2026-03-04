import { DollarSign, Award, Target } from "lucide-react";
import Navbar from "@/components/ui/Navbar";
import Footer from "@/components/ui/Footer";
import SectionContainer from "@/components/ui/SectionContainer";
import CTAButton from "@/components/ui/CTAButton";
import TrustSignals from "@/components/ui/TrustSignals";
import HowItWorks from "@/components/ui/HowItWorks";
import FlipCard from "@/components/ui/FlipCard";
import JobCardCompact from "@/components/ui/JobCardCompact";
import { createClient } from "@/utils/supabase/server";
import { getCmsPage } from "@/app/actions/cms";

async function getFeaturedJobs() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("job_postings")
    .select(
      "id, title, specialty, shift_type, pay_package_total, facilities(id, name, location_city, location_state)"
    )
    .eq("is_active", true)
    .eq("is_featured", true)
    .order("created_at", { ascending: false })
    .limit(3);
  return data ?? [];
}

function cms(
  sections: Record<string, Record<string, unknown>>,
  sectionKey: string,
  fieldKey: string,
  fallback: string
): string {
  const val = sections[sectionKey]?.[fieldKey];
  return typeof val === "string" && val.trim() ? val : fallback;
}

export default async function Home() {
  const [featuredJobs, cmsRows] = await Promise.all([
    getFeaturedJobs(),
    getCmsPage("homepage").catch(() => []),
  ]);

  // Build a lookup: { section_key: { field: value } }
  const sections: Record<string, Record<string, unknown>> = {};
  for (const row of cmsRows) {
    sections[row.section_key] = row.content;
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* ── HERO ── */}
      <SectionContainer bg="peach-gradient" className="py-24 md:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold leading-tight text-brand-charcoal md:text-5xl">
            {cms(sections, "hero", "headline", "The Financial Decision Engine for Travel Nurses")}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-brand-gray-500">
            {cms(sections, "hero", "subheadline", "Analyze any contract. See your real take-home. Detect margin risk before you sign.")}
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <CTAButton href="/analyze">
              {cms(sections, "hero", "cta_primary", "Analyze My Offer")}
            </CTAButton>
            <CTAButton href="/jobs" variant="outline">
              {cms(sections, "hero", "cta_secondary", "Find Jobs")}
            </CTAButton>
          </div>
          <TrustSignals />
        </div>
      </SectionContainer>

      {/* ── VALUE PROPOSITION — FLIP CARDS ── */}
      <SectionContainer bg="white">
        <h2 className="mb-4 text-center text-3xl font-bold text-brand-charcoal">
          {cms(sections, "value_props", "headline", "Know More. Earn More. Own Your Career.")}
        </h2>
        <p className="mx-auto mb-12 max-w-2xl text-center text-brand-gray-500">
          {cms(sections, "value_props", "subheadline", "RNTell gives you the financial intelligence that was hidden behind middlemen.")}
        </p>
        <div className="grid gap-8 md:grid-cols-3">
          <FlipCard
            icon={<DollarSign className="h-7 w-7 text-brand-success-dark" />}
            title={cms(sections, "value_props", "card1_title", "Real Take-Home Clarity")}
            subtitle={cms(sections, "value_props", "card1_subtitle", "Net pay after housing, full stipend breakdown, and margin detection — so you know exactly what lands in your account.")}
          />
          <FlipCard
            icon={<Award className="h-7 w-7 text-brand-success-dark" />}
            title={cms(sections, "value_props", "card2_title", "Federal & Long-Term Value Detection")}
            subtitle={cms(sections, "value_props", "card2_subtitle", "Automatic PSLF eligibility detection, HRSA HPSA lookup, and a federal strength score for every contract you analyze.")}
          />
          <FlipCard
            icon={<Target className="h-7 w-7 text-brand-success-dark" />}
            title={cms(sections, "value_props", "card3_title", "Smarter Job Matching")}
            subtitle={cms(sections, "value_props", "card3_subtitle", "Smart Match scoring ranks jobs by specialty fit, license alignment, and financial strength — so you see the best opportunities first.")}
          />
        </div>
      </SectionContainer>

      {/* ── HOW IT WORKS ── */}
      <SectionContainer bg="warm">
        <h2 className="mb-12 text-center text-3xl font-bold text-brand-charcoal">
          {cms(sections, "how_it_works", "headline", "How It Works")}
        </h2>
        <HowItWorks
          steps={
            sections.how_it_works?.step1_title
              ? [
                  { title: cms(sections, "how_it_works", "step1_title", "Analyze Your Offer"), description: cms(sections, "how_it_works", "step1_desc", "Enter your contract details or upload a PDF. Get an instant financial breakdown.") },
                  { title: cms(sections, "how_it_works", "step2_title", "Compare to Market"), description: cms(sections, "how_it_works", "step2_desc", "See how your pay, stipends, and benefits compare to GSA benchmarks and market data.") },
                  { title: cms(sections, "how_it_works", "step3_title", "Apply Direct"), description: cms(sections, "how_it_works", "step3_desc", "Apply directly to facilities. No middlemen. No margin on your pay.") },
                ]
              : undefined
          }
        />
      </SectionContainer>

      {/* ── FEATURED JOBS ── */}
      {featuredJobs.length > 0 && (
        <SectionContainer bg="white">
          <h2 className="mb-2 text-center text-3xl font-bold text-brand-charcoal">
            {cms(sections, "featured_jobs", "headline", "Featured Assignments")}
          </h2>
          <p className="mx-auto mb-10 max-w-xl text-center text-brand-gray-500">
            {cms(sections, "featured_jobs", "subheadline", "The latest direct-hire and verified opportunities.")}
          </p>
          <div className="flex gap-5 overflow-x-auto pb-4 md:grid md:grid-cols-3 md:overflow-visible">
            {featuredJobs.map((job) => {
              const facility = Array.isArray(job.facilities)
                ? job.facilities[0]
                : job.facilities;
              return (
                <JobCardCompact
                  key={job.id}
                  job={{ ...job, facilities: facility ?? null }}
                />
              );
            })}
          </div>
          <div className="mt-8 text-center">
            <CTAButton href="/jobs" variant="outline">
              {cms(sections, "featured_jobs", "cta", "View All Jobs")}
            </CTAButton>
          </div>
        </SectionContainer>
      )}

      <Footer />
    </div>
  );
}
