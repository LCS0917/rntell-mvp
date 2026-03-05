import { DollarSign, Award, Target, ArrowRight } from "lucide-react";
import Navbar from "@/components/ui/Navbar";
import Footer from "@/components/ui/Footer";
import SectionContainer from "@/components/ui/SectionContainer";
import CTAButton from "@/components/ui/CTAButton";
import TrustSignals from "@/components/ui/TrustSignals";
import { createClient } from "@/utils/supabase/server";
import { getCmsPage } from "@/app/actions/cms";
import Link from "next/link";

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

  const sections: Record<string, Record<string, unknown>> = {};
  for (const row of cmsRows) {
    sections[row.section_key] = row.content;
  }

  return (
    <div className="min-h-screen bg-brand-warm selection:bg-brand-orange selection:text-white">
      <Navbar />

      {/* ── HERO: Editorial, fluid typography, asymmetric ── */}
      <section className="relative px-6 py-20 md:px-12 md:py-32 lg:px-24">
        <div className="mx-auto max-w-[1400px]">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-8">
              <h1 className="text-[clamp(3rem,8vw,7rem)] font-extrabold leading-[0.9] tracking-tight text-brand-charcoal">
                {cms(sections, "hero", "headline", "The Financial Decision Engine for Travel Nurses.")}
              </h1>
            </div>
            <div className="flex flex-col justify-end lg:col-span-4 lg:pb-4">
              <p className="max-w-md text-[clamp(1.125rem,2vw,1.5rem)] font-medium leading-snug text-brand-charcoal/80">
                {cms(sections, "hero", "subheadline", "Analyze any contract. See your real take-home. Detect margin risk before you sign.")}
              </p>
              <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row">
                <CTAButton href="/analyze" className="w-full sm:w-auto">
                  {cms(sections, "hero", "cta_primary", "Analyze My Offer")}
                </CTAButton>
                <CTAButton href="/jobs" variant="outline" className="w-full sm:w-auto border-brand-charcoal text-brand-charcoal hover:bg-brand-charcoal hover:text-white">
                  {cms(sections, "hero", "cta_secondary", "Find Jobs")}
                </CTAButton>
              </div>
            </div>
          </div>
          <div className="mt-20 border-t-2 border-brand-charcoal/10 pt-8">
            <TrustSignals />
          </div>
        </div>
      </section>

      {/* ── VALUE PROPOSITION: Brutalist/Editorial List instead of identical cards ── */}
      <section className="bg-brand-charcoal px-6 py-24 text-brand-warm md:px-12 lg:px-24">
        <div className="mx-auto max-w-[1400px]">
          <h2 className="mb-16 text-[clamp(2.5rem,5vw,4.5rem)] font-bold leading-tight tracking-tight">
            {cms(sections, "value_props", "headline", "Know More. Earn More. Own Your Career.")}
          </h2>
          
          <div className="grid gap-0 border-t-2 border-brand-warm/20 md:grid-cols-3">
            {[
              {
                num: "01",
                title: cms(sections, "value_props", "card1_title", "Real Take-Home Clarity"),
                desc: cms(sections, "value_props", "card1_subtitle", "Net pay after housing, full stipend breakdown, and margin detection — so you know exactly what lands in your account."),
              },
              {
                num: "02",
                title: cms(sections, "value_props", "card2_title", "Federal Value Detection"),
                desc: cms(sections, "value_props", "card2_subtitle", "Automatic PSLF eligibility detection, HRSA HPSA lookup, and a federal strength score for every contract you analyze."),
              },
              {
                num: "03",
                title: cms(sections, "value_props", "card3_title", "Smarter Job Matching"),
                desc: cms(sections, "value_props", "card3_subtitle", "Smart Match scoring ranks jobs by specialty fit, license alignment, and financial strength — so you see the best opportunities first."),
              }
            ].map((prop, idx) => (
              <div key={idx} className="border-b-2 border-brand-warm/20 px-0 py-10 md:border-b-0 md:border-r-2 md:px-8 lg:px-12 [&:last-child]:border-r-0 [&:first-child]:pl-0 [&:last-child]:pr-0">
                <span className="mb-8 block text-sm font-bold tracking-widest text-brand-orange">{prop.num}</span>
                <h3 className="mb-6 text-2xl font-semibold md:text-3xl">{prop.title}</h3>
                <p className="text-lg leading-relaxed text-brand-warm/70">{prop.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS: High contrast, asymmetric layout ── */}
      <section className="bg-brand-mint-50 px-6 py-24 md:px-12 lg:px-24">
        <div className="mx-auto max-w-[1400px]">
          <div className="grid gap-16 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <h2 className="text-[clamp(2.5rem,5vw,4.5rem)] font-bold leading-tight tracking-tight text-brand-charcoal">
                {cms(sections, "how_it_works", "headline", "How It Works")}
              </h2>
            </div>
            <div className="lg:col-span-7">
              <div className="space-y-12 border-l-4 border-brand-success-dark/20 pl-8 lg:pl-12">
                {[
                  {
                    title: cms(sections, "how_it_works", "step1_title", "Analyze Your Offer"),
                    desc: cms(sections, "how_it_works", "step1_desc", "Enter your contract details or upload a PDF. Get an instant financial breakdown."),
                  },
                  {
                    title: cms(sections, "how_it_works", "step2_title", "Compare to Market"),
                    desc: cms(sections, "how_it_works", "step2_desc", "See how your pay, stipends, and benefits compare to GSA benchmarks and market data."),
                  },
                  {
                    title: cms(sections, "how_it_works", "step3_title", "Apply Direct"),
                    desc: cms(sections, "how_it_works", "step3_desc", "Apply directly to facilities. No middlemen. No margin on your pay."),
                  }
                ].map((step, idx) => (
                  <div key={idx} className="relative">
                    <span className="absolute -left-[2.75rem] top-1 flex h-8 w-8 items-center justify-center rounded-full bg-brand-success-dark font-bold text-white lg:-left-[3.75rem]">
                      {idx + 1}
                    </span>
                    <h3 className="mb-3 text-2xl font-bold text-brand-charcoal">{step.title}</h3>
                    <p className="max-w-xl text-lg text-brand-charcoal/70">{step.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURED JOBS: Sleek list replacing cards ── */}
      {featuredJobs.length > 0 && (
        <section className="px-6 py-24 md:px-12 lg:px-24">
          <div className="mx-auto max-w-[1400px]">
            <div className="mb-16 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
              <div>
                <h2 className="text-[clamp(2rem,4vw,3.5rem)] font-bold leading-tight tracking-tight text-brand-charcoal">
                  {cms(sections, "featured_jobs", "headline", "Featured Assignments")}
                </h2>
                <p className="mt-4 text-xl text-brand-gray-500">
                  {cms(sections, "featured_jobs", "subheadline", "The latest direct-hire and verified opportunities.")}
                </p>
              </div>
              <Link 
                href="/jobs" 
                className="group flex items-center gap-2 text-lg font-semibold text-brand-orange transition-colors hover:text-brand-orange-hover"
              >
                {cms(sections, "featured_jobs", "cta", "View All Jobs")}
                <ArrowRight className="transition-transform group-hover:translate-x-1" size={20} />
              </Link>
            </div>

            <div className="flex flex-col border-t-2 border-brand-charcoal">
              {featuredJobs.map((job) => {
                const facility = Array.isArray(job.facilities) ? job.facilities[0] : job.facilities;
                const location = facility ? [facility.location_city, facility.location_state].filter(Boolean).join(", ") : "";
                
                return (
                  <Link 
                    key={job.id} 
                    href={`/jobs/${job.id}`}
                    className="group flex flex-col items-start justify-between gap-6 border-b border-brand-charcoal/10 py-8 transition-colors hover:bg-white md:flex-row md:items-center px-4"
                  >
                    <div className="flex-1">
                      <p className="mb-2 text-sm font-bold tracking-widest text-brand-orange uppercase">{job.specialty}</p>
                      <h3 className="text-2xl font-bold text-brand-charcoal group-hover:text-brand-orange transition-colors">
                        {facility?.name || "Unknown Facility"}
                      </h3>
                      <div className="mt-2 flex items-center gap-3 text-brand-charcoal/60">
                        {location && <span>{location}</span>}
                        {job.shift_type && (
                          <>
                            <span className="h-1 w-1 rounded-full bg-brand-charcoal/30"></span>
                            <span className="capitalize">{job.shift_type}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-left md:text-right">
                        <p className="text-3xl font-extrabold tracking-tight text-brand-teal">
                          {job.pay_package_total ? `$${job.pay_package_total.toLocaleString()}` : "Pay TBD"}
                        </p>
                        <p className="text-sm font-medium text-brand-charcoal/50 uppercase tracking-wider">Per Week</p>
                      </div>
                      <div className="hidden h-12 w-12 items-center justify-center rounded-full bg-brand-warm transition-colors group-hover:bg-brand-orange group-hover:text-white md:flex">
                        <ArrowRight size={20} />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}
