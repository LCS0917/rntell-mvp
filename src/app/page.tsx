import { DollarSign, Award, Target, ArrowRight, Zap } from "lucide-react";
import Navbar from "@/components/ui/Navbar";
import Footer from "@/components/ui/Footer";
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
    <div className="min-h-screen bg-brand-warm selection:bg-brand-orange selection:text-white font-sans overflow-x-hidden">
      <Navbar />

      <main className="mx-auto max-w-[1400px] px-6 py-12 md:px-12 md:py-20 lg:px-24">
        
        {/* BENTO GRID */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          
          {/* ── HERO CARD (Spans full width) ── */}
          <div className="group animate-reveal relative overflow-hidden rounded-[2rem] border-2 border-brand-charcoal bg-white p-10 transition-transform duration-500 hover:-translate-y-1 hover:shadow-[0_20px_0_0_oklch(0.20_0.02_40)] md:p-16 lg:col-span-12 lg:p-24">
            {/* Subtle decorative mesh/blob in the background for warmth */}
            <div className="absolute -right-20 -top-20 z-0 h-[600px] w-[600px] rounded-full bg-brand-peach-200/40 blur-[80px] transition-transform duration-700 group-hover:scale-110" />
            
            <div className="relative z-10 grid gap-12 lg:grid-cols-12 lg:gap-8">
              <div className="lg:col-span-7">
                <h1 className="text-[clamp(3.5rem,8vw,7.5rem)] font-extrabold leading-[0.85] tracking-tighter text-brand-charcoal">
                  The <span className="text-brand-orange">Financial Decision Engine</span> for Travel Nurses.
                </h1>
              </div>
              <div className="flex flex-col justify-end lg:col-span-5 lg:pb-4">
                <p className="max-w-md text-[clamp(1.125rem,2vw,1.5rem)] font-medium leading-snug text-brand-charcoal/80">
                  {cms(sections, "hero", "subheadline", "Analyze any contract. See your real take-home. Detect margin risk before you sign.")}
                </p>
                <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row">
                  <CTAButton href="/analyze" className="w-full sm:w-auto">
                    {cms(sections, "hero", "cta_primary", "Analyze My Offer")}
                  </CTAButton>
                  <CTAButton href="/jobs" variant="outline" className="w-full sm:w-auto">
                    {cms(sections, "hero", "cta_secondary", "Find Jobs")}
                  </CTAButton>
                </div>
              </div>
            </div>
            <div className="relative z-10 mt-20 border-t-2 border-brand-charcoal/10 pt-8">
              <TrustSignals />
            </div>
          </div>

          {/* ── VALUE PROPOSITION HEADER (Spans full width) ── */}
          <div className="animate-reveal flex flex-col justify-center rounded-[2rem] border-2 border-brand-charcoal bg-brand-charcoal p-10 text-brand-warm transition-transform duration-500 hover:-translate-y-1 hover:shadow-[0_12px_0_0_oklch(0.65_0.22_40)] md:p-16 lg:col-span-12" style={{ animationDelay: '150ms' }}>
            <h2 className="max-w-4xl text-[clamp(2.5rem,5vw,4.5rem)] font-extrabold leading-[0.9] tracking-tighter">
              <span className="text-brand-orange">Know More.</span> Earn More. Own Your Career.
            </h2>
          </div>

          {/* ── VALUE PROPOSITION CARDS (3 columns) ── */}
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
              className={`group relative overflow-hidden rounded-[2rem] border-2 border-brand-charcoal bg-white p-10 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_12px_0_0_oklch(0.20_0.02_40)] lg:col-span-4 ${prop.colorClass}`}
              style={{ animationDelay: `${(idx + 2) * 150}ms` }}
            >
              {/* Decorative oversized background number */}
              <div className="pointer-events-none absolute -right-6 -top-10 z-0 select-none text-[12rem] font-extrabold leading-none text-brand-charcoal/[0.03] transition-colors duration-300 group-hover:text-brand-charcoal/10">
                {prop.num}
              </div>
              
              <div className="relative z-10 flex h-full flex-col justify-between">
                <div>
                  <span className="mb-6 block font-mono text-sm font-bold tracking-widest text-brand-orange transition-colors duration-300 group-hover:text-brand-charcoal">
                    {prop.num}
                  </span>
                  <h3 className="mb-4 text-3xl font-extrabold tracking-tight text-brand-charcoal transition-colors duration-300 md:text-4xl">{prop.title}</h3>
                </div>
                <p className="mt-4 text-lg font-medium leading-relaxed text-brand-charcoal/70 transition-colors duration-300 group-hover:text-brand-charcoal/90">
                  {prop.desc}
                </p>
              </div>
            </div>
          ))}

          {/* ── HOW IT WORKS CARD (Spans full width) ── */}
          <div className="group animate-reveal relative rounded-[2rem] border-2 border-brand-charcoal bg-brand-mint-50 p-10 transition-transform duration-500 hover:-translate-y-1 hover:shadow-[0_16px_0_0_oklch(0.20_0.02_40)] md:p-16 lg:col-span-12" style={{ animationDelay: '600ms' }}>
            <div className="mb-12 flex items-center justify-between border-b-2 border-brand-charcoal/10 pb-8">
              <h2 className="text-[clamp(2rem,4vw,3.5rem)] font-extrabold leading-none tracking-tighter text-brand-charcoal">
                How It Works <Zap className="inline-block text-brand-orange" size={40} fill="currentColor" />
              </h2>
            </div>
            
            <div className="grid gap-12 lg:grid-cols-3">
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
                <div key={idx} className="group/step relative transition-transform duration-300 hover:-translate-y-2">
                  <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-brand-charcoal bg-white font-mono text-xl font-bold text-brand-charcoal shadow-[4px_4px_0_0_oklch(0.20_0.02_40)] transition-transform duration-300 group-hover/step:-rotate-6 group-hover/step:scale-110">
                    {idx + 1}
                  </div>
                  <h3 className="mb-3 text-2xl font-extrabold tracking-tight text-brand-charcoal transition-colors duration-300 group-hover/step:text-brand-success-dark">{step.title}</h3>
                  <p className="text-lg font-medium leading-relaxed text-brand-charcoal/70">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── FEATURED JOBS (Spans full width) ── */}
          {featuredJobs.length > 0 && (
            <div className="group animate-reveal relative rounded-[2rem] border-2 border-brand-charcoal bg-white p-10 transition-transform duration-500 hover:-translate-y-1 hover:shadow-[0_16px_0_0_oklch(0.20_0.02_40)] md:p-16 lg:col-span-12" style={{ animationDelay: '750ms' }}>
              <div className="mb-12 flex flex-col items-start justify-between gap-6 border-b-2 border-brand-charcoal/10 pb-8 md:flex-row md:items-end">
                <div>
                  <h2 className="text-[clamp(2.5rem,5vw,4.5rem)] font-extrabold leading-[0.9] tracking-tighter text-brand-charcoal">
                    {cms(sections, "featured_jobs", "headline", "Featured Assignments")}
                  </h2>
                  <p className="mt-4 max-w-2xl text-xl font-medium text-brand-charcoal/60">
                    {cms(sections, "featured_jobs", "subheadline", "The latest direct-hire and verified opportunities.")}
                  </p>
                </div>
                <CTAButton href="/jobs" variant="outline" className="shrink-0">
                  {cms(sections, "featured_jobs", "cta", "View All Jobs")}
                </CTAButton>
              </div>

              <div className="flex flex-col">
                {featuredJobs.map((job, index) => {
                  const facility = Array.isArray(job.facilities) ? job.facilities[0] : job.facilities;
                  const location = facility ? [facility.location_city, facility.location_state].filter(Boolean).join(", ") : "";
                  
                  return (
                    <Link 
                      key={job.id} 
                      href={`/jobs/${job.id}`}
                      className={`group/job flex flex-col items-start justify-between gap-6 py-8 transition-colors hover:bg-brand-warm/50 md:flex-row md:items-center ${index !== featuredJobs.length - 1 ? 'border-b-2 border-brand-charcoal/10' : ''}`}
                    >
                      <div className="flex-1">
                        <p className="mb-2 font-mono text-sm font-bold tracking-widest text-brand-orange uppercase">
                          {job.specialty}
                        </p>
                        <h3 className="text-2xl font-extrabold tracking-tight text-brand-charcoal transition-colors duration-300 group-hover/job:text-brand-orange md:text-3xl">
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
                          <p className="text-3xl font-extrabold tracking-tight text-brand-teal lg:text-5xl">
                            {job.pay_package_total ? `$${job.pay_package_total.toLocaleString()}` : "Pay TBD"}
                          </p>
                          <p className="mt-1 font-mono text-sm font-bold tracking-widest text-brand-charcoal/50 uppercase">Per Week</p>
                        </div>
                        <div className="hidden h-14 w-14 items-center justify-center rounded-2xl border-2 border-brand-charcoal bg-white font-bold text-brand-charcoal shadow-[4px_4px_0_0_oklch(0.20_0.02_40)] transition-transform duration-300 group-hover/job:rotate-12 group-hover/job:scale-110 md:flex">
                          <ArrowRight size={24} />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
