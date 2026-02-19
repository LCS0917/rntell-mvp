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

async function getFeaturedJobs() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("job_postings")
    .select(
      "id, title, specialty, shift_type, pay_package_total, facilities(id, name, location_city, location_state)"
    )
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(5);
  return data ?? [];
}

export default async function Home() {
  const featuredJobs = await getFeaturedJobs();

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* ── HERO ── */}
      <SectionContainer bg="peach-gradient" className="py-24 md:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold leading-tight text-brand-charcoal md:text-5xl">
            The Financial Decision Engine
            <br className="hidden sm:block" /> for Travel Nurses
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-brand-gray-500">
            Analyze any contract. See your real take-home. Detect margin risk
            before you sign.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <CTAButton href="/analyze">Analyze My Offer</CTAButton>
            <CTAButton href="/jobs" variant="outline">
              Find Jobs
            </CTAButton>
          </div>
          <TrustSignals />
        </div>
      </SectionContainer>

      {/* ── VALUE PROPOSITION — FLIP CARDS ── */}
      <SectionContainer bg="white">
        <h2 className="mb-4 text-center text-3xl font-bold text-brand-charcoal">
          Know More. Earn More. Own Your Career.
        </h2>
        <p className="mx-auto mb-12 max-w-2xl text-center text-brand-gray-500">
          RNTell gives you the financial intelligence that was hidden behind
          middlemen.
        </p>
        <div className="grid gap-8 md:grid-cols-3">
          <FlipCard
            icon={<DollarSign className="h-7 w-7 text-brand-success-dark" />}
            title="Real Take-Home Clarity"
            subtitle="Net pay after housing, full stipend breakdown, and margin detection — so you know exactly what lands in your account."
          />
          <FlipCard
            icon={<Award className="h-7 w-7 text-brand-success-dark" />}
            title="Federal & Long-Term Value Detection"
            subtitle="Automatic PSLF eligibility detection, HRSA HPSA lookup, and a federal strength score for every contract you analyze."
          />
          <FlipCard
            icon={<Target className="h-7 w-7 text-brand-success-dark" />}
            title="Smarter Job Matching"
            subtitle="Smart Match scoring ranks jobs by specialty fit, license alignment, and financial strength — so you see the best opportunities first."
          />
        </div>
      </SectionContainer>

      {/* ── HOW IT WORKS ── */}
      <SectionContainer bg="warm">
        <h2 className="mb-12 text-center text-3xl font-bold text-brand-charcoal">
          How It Works
        </h2>
        <HowItWorks />
      </SectionContainer>

      {/* ── FEATURED JOBS ── */}
      {featuredJobs.length > 0 && (
        <SectionContainer bg="white">
          <h2 className="mb-2 text-center text-3xl font-bold text-brand-charcoal">
            Featured Assignments
          </h2>
          <p className="mx-auto mb-10 max-w-xl text-center text-brand-gray-500">
            The latest direct-hire and verified opportunities.
          </p>
          <div className="flex gap-5 overflow-x-auto pb-4 md:grid md:grid-cols-5 md:overflow-visible">
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
              View All Jobs
            </CTAButton>
          </div>
        </SectionContainer>
      )}

      {/* ── BOTTOM CTA ── */}
      <SectionContainer bg="charcoal" className="py-16 md:py-20">
        <div className="text-center">
          <h2 className="mb-6 text-2xl font-bold text-white md:text-3xl">
            Ready to see what your contract is really worth?
          </h2>
          <CTAButton href="/analyze">Analyze My Offer</CTAButton>
        </div>
      </SectionContainer>

      <Footer />
    </div>
  );
}
