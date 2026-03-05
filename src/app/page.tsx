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
    <div className="min-h-screen bg-brand-warm selection:bg-brand-orange selection:text-white overflow-x-hidden">
      <Navbar />

      {/* ── HERO: Editorial, fluid typography, asymmetric with staggered animations ── */}
      <section className="relative px-6 py-20 md:px-12 md:py-32 lg:px-24">
        {/* Subtle decorative mesh/blob in the background for warmth and delight */}
        <div className="absolute -right-1/4 -top-20 -z-10 h-[800px] w-[800px] animate-fade-in rounded-full bg-brand-peach-200/20 blur-[120px]" />
        
        <div className="mx-auto max-w-[1400px]">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-8">
              <h1 className="animate-reveal text-[clamp(3.5rem,8vw,7.5rem)] font-extrabold leading-[0.85] tracking-tighter text-brand-charcoal">
                The <span className="text-brand-orange">Financial Decision Engine</span> for Travel Nurses.
              </h1>
            </div>
            <div className="flex flex-col justify-end lg:col-span-4 lg:pb-4">
              <p className="animate-reveal [animation-delay:150ms] max-w-md text-[clamp(1.125rem,2vw,1.5rem)] font-medium leading-snug text-brand-charcoal/80">
                {cms(sections, "hero", "subheadline", "Analyze any contract. See your real take-home. Detect margin risk before you sign.")}
              </p>
              <div className="animate-reveal [animation-delay:300ms] mt-10 flex flex-col items-start gap-4 sm:flex-row">
                <CTAButton href="/analyze" className="w-full sm:w-auto shadow-xl shadow-brand-orange/20 transition-transform duration-300 hover:-translate-y-1">
                  {cms(sections, "hero", "cta_primary", "Analyze My Offer")}
                </CTAButton>
                <CTAButton href="/jobs" variant="outline" className="w-full sm:w-auto border-2 border-brand-charcoal text-brand-charcoal transition-transform duration-300 hover:-translate-y-1 hover:bg-brand-charcoal hover:text-white">
                  {cms(sections, "hero", "cta_secondary", "Find Jobs")}
                </CTAButton>
              </div>
            </div>
          </div>
          <div className="animate-fade-in [animation-delay:600ms] mt-24 border-t-2 border-brand-charcoal/10 pt-8">
            <TrustSignals />
          </div>
        </div>
      </section>

      {/* ── VALUE PROPOSITION: High contrast, interactive hover panels ── */}
      <section className="bg-brand-charcoal px-6 py-32 text-brand-warm md:px-12 lg:px-24">
        <div className="mx-auto max-w-[1400px]">
          <h2 className="mb-20 max-w-4xl text-[clamp(3rem,6vw,5.5rem)] font-extrabold leading-[0.9] tracking-tighter">
            <span className="text-brand-orange">Know More.</span> Earn More. Own Your Career.
          </h2>
          
          <div className="grid gap-0 border-t-2 border-brand-warm/20 lg:grid-cols-3">
            {[
              {
                num: "01",
                title: cms(sections, "value_props", "card1_title", "Real Take-Home Clarity"),
                desc: cms(sections, "value_props", "card1_subtitle", "Net pay after housing, full stipend breakdown, and margin detection — so you know exactly what lands in your account."),
                colorClass: "hover:bg-brand-peach-400"
              },
              {
                num: "02",
                title: cms(sections, "value_props", "card2_title", "Federal Value Detection"),
                desc: cms(sections, "value_props", "card2_subtitle", "Automatic PSLF eligibility detection, HRSA HPSA lookup, and a federal strength score for every contract you analyze."),
                colorClass: "hover:bg-brand-teal"
              },
              {
                num: "03",
                title: cms(sections, "value_props", "card3_title", "Smarter Job Matching"),
                desc: cms(sections, "value_props", "card3_subtitle", "Smart Match scoring ranks jobs by specialty fit, license alignment, and financial strength — so you see the best opportunities first."),
                colorClass: "hover:bg-brand-mint-300"
              }
            ].map((prop, idx) => (
              <div 
                key={idx} 
                className={`group relative overflow-hidden border-b-2 border-brand-warm/20 px-8 py-16 transition-colors duration-500 md:px-10 lg:border-b-0 lg:border-r-2 lg:px-16 lg:[&:last-child]:border-r-0 ${prop.colorClass} hover:text-brand-charcoal`}
              >
                {/* Decorative oversized background number */}
                <div className="pointer-events-none absolute -right-6 -top-10 z-0 select-none text-[14rem] font-extrabold leading-none text-brand-warm/[0.03] transition-colors duration-500 group-hover:text-brand-charcoal/10">
                  {prop.num}
                </div>
                
                <div className="relative z-10">
                  <span className="mb-8 block font-mono text-sm font-bold tracking-widest text-brand-orange transition-colors duration-500 group-hover:text-brand-charcoal">
                    {prop.num}
                  </span>
                  <h3 className="mb-6 text-3xl font-extrabold tracking-tight md:text-4xl">{prop.title}</h3>
                  <p className="text-lg font-medium leading-relaxed text-brand-warm/70 transition-colors duration-500 group-hover:text-brand-charcoal/80">
                    {prop.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS: Sticky scrolling and interactive timeline ── */}
      <section className="bg-brand-mint-50 px-6 py-32 md:px-12 lg:px-24 relative z-0">
        <div className="mx-auto max-w-[1400px]">
          <div className="grid gap-16 lg:grid-cols-12 lg:gap-24">
            <div className="lg:col-span-5">
              <div className="sticky top-32">
                <h2 className="text-[clamp(3rem,6vw,5.5rem)] font-extrabold leading-[0.9] tracking-tighter text-brand-charcoal">
                  {cms(sections, "how_it_works", "headline", "How It Works")}
                </h2>
                <div className="mt-8 hidden h-2 w-24 bg-brand-success-dark lg:block"></div>
              </div>
            </div>
            <div className="lg:col-span-7">
              <div className="space-y-20 border-l-4 border-brand-charcoal/10 pl-8 lg:pl-16 relative">
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
                  <div key={idx} className="group relative transition-transform duration-500 hover:translate-x-2">
                    <span className="absolute -left-[2.75rem] top-0 flex h-10 w-10 items-center justify-center rounded-full bg-brand-charcoal font-bold text-white transition-colors duration-500 group-hover:bg-brand-success-dark lg:-left-[4.25rem] lg:h-12 lg:w-12 lg:text-lg">
                      {idx + 1}
                    </span>
                    <h3 className="mb-4 text-3xl font-extrabold tracking-tight text-brand-charcoal transition-colors duration-300 group-hover:text-brand-success-dark">{step.title}</h3>
                    <p className="max-w-xl text-xl font-medium leading-relaxed text-brand-charcoal/70">{step.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURED JOBS: High contrast dynamic list ── */}
      {featuredJobs.length > 0 && (
        <section className="px-6 py-32 md:px-12 lg:px-24">
          <div className="mx-auto max-w-[1400px]">
            <div className="mb-16 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
              <div>
                <h2 className="text-[clamp(3rem,6vw,5.5rem)] font-extrabold leading-[0.9] tracking-tighter text-brand-charcoal">
                  {cms(sections, "featured_jobs", "headline", "Featured Assignments")}
                </h2>
                <p className="mt-4 max-w-2xl text-xl font-medium text-brand-charcoal/60">
                  {cms(sections, "featured_jobs", "subheadline", "The latest direct-hire and verified opportunities.")}
                </p>
              </div>
              <Link 
                href="/jobs" 
                className="group flex items-center gap-2 border-b-2 border-brand-orange pb-1 text-lg font-bold uppercase tracking-widest text-brand-orange transition-colors hover:text-brand-orange-hover"
              >
                {cms(sections, "featured_jobs", "cta", "View All Jobs")}
                <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" size={20} />
              </Link>
            </div>

            <div className="flex flex-col border-t-4 border-brand-charcoal">
              {featuredJobs.map((job) => {
                const facility = Array.isArray(job.facilities) ? job.facilities[0] : job.facilities;
                const location = facility ? [facility.location_city, facility.location_state].filter(Boolean).join(", ") : "";
                
                return (
                  <Link 
                    key={job.id} 
                    href={`/jobs/${job.id}`}
                    className="group flex flex-col items-start justify-between gap-6 border-b-2 border-brand-charcoal/10 px-4 py-10 transition-colors hover:bg-white md:flex-row md:items-center"
                  >
                    <div className="flex-1">
                      <p className="mb-2 font-mono text-sm font-bold tracking-widest text-brand-orange uppercase">
                        {job.specialty}
                      </p>
                      <h3 className="text-3xl font-extrabold tracking-tight text-brand-charcoal transition-colors duration-300 group-hover:text-brand-orange">
                        {facility?.name || "Unknown Facility"}
                      </h3>
                      <div className="mt-3 flex items-center gap-3 font-medium text-brand-charcoal/60">
                        {location && <span>{location}</span>}
                        {job.shift_type && (
                          <>
                            <span className="h-1.5 w-1.5 rounded-full bg-brand-charcoal/30"></span>
                            <span className="capitalize">{job.shift_type}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-left md:text-right">
                        <p className="text-4xl font-extrabold tracking-tight text-brand-teal lg:text-5xl">
                          {job.pay_package_total ? `$${job.pay_package_total.toLocaleString()}` : "Pay TBD"}
                        </p>
                        <p className="mt-1 font-mono text-sm font-bold tracking-widest text-brand-charcoal/50 uppercase">Per Week</p>
                      </div>
                      <div className="hidden h-14 w-14 items-center justify-center rounded-full bg-brand-warm transition-colors duration-300 group-hover:bg-brand-orange group-hover:text-white md:flex">
                        <ArrowRight size={24} />
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
