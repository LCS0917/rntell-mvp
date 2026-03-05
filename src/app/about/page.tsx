import { Metadata } from "next";
import { DollarSign, Home, ShieldAlert, FileSearch, Users, Sparkles, Zap, ArrowRight, Wrench } from "lucide-react";
import Navbar from "@/components/ui/Navbar";
import Footer from "@/components/ui/Footer";
import CTAButton from "@/components/ui/CTAButton";
import HowItWorks from "@/components/ui/HowItWorks";

export const metadata: Metadata = {
  title: "About | RNTell",
  description:
    "Financial clarity and transparency for travel nurses. Learn how RNTell helps you understand your real take-home pay.",
};

const problems = [
  {
    icon: DollarSign,
    title: "Pay Confusion",
    body: "Hourly rates, stipends, and bill rates obscure real take-home pay. Nurses often don't know what they actually earn.",
    color: "bg-brand-peach-50 text-brand-orange",
  },
  {
    icon: Home,
    title: "Stipend Misalignment",
    body: "Housing and meal stipends often don't match GSA rates, creating hidden margin gaps that cost nurses thousands.",
    color: "bg-brand-mint-50 text-[#66BB6A]",
  },
  {
    icon: ShieldAlert,
    title: "Compliance Risk",
    body: "Wage recharacterization and taxability rules are complex and poorly communicated, putting nurses at audit risk.",
    color: "bg-red-50 text-red-500",
  },
  {
    icon: FileSearch,
    title: "Limited Visibility",
    body: "Nurses lack insight into employer classification, 501(c)(3) status, and federal program eligibility like PSLF.",
    color: "bg-blue-50 text-blue-500",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-brand-warm selection:bg-brand-orange selection:text-white font-sans overflow-x-hidden">
      <Navbar />

      <main className="mx-auto max-w-[1400px] px-6 py-12 md:px-12 md:py-24 lg:px-24">
        
        {/* ── HERO / MISSION SECTION: Editorial, non-boxed, quieter typography ── */}
        <section className="mb-24 animate-reveal">
          <div className="max-w-4xl">
            <div className="mb-6 inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-brand-orange">
              <Sparkles size={14} /> Our Mission
            </div>
            <h1 className="text-[clamp(3rem,8vw,6.5rem)] font-bold leading-[0.95] tracking-tighter text-brand-charcoal">
              Financial <span className="text-brand-orange">Clarity</span> <br className="hidden md:block"/>
              for Every Travel Nurse.
            </h1>
            <p className="mt-10 max-w-2xl text-[clamp(1.125rem,2vw,1.25rem)] font-medium leading-relaxed text-brand-charcoal/70">
              RNTell is the financial intelligence layer that eliminates pay confusion. We give nurses direct access to market data, contract analysis, and federal incentive detection — without middlemen taking a cut.
            </p>
          </div>
        </section>

        {/* BENTO GRID */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          
          {/* ── PROBLEM CARDS (1 column each on desktop) ── */}
          {problems.map((p, i) => (
            <div 
              key={p.title}
              className={`group animate-reveal relative flex flex-col justify-between overflow-hidden rounded-[2rem] bg-white p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl`}
              style={{ animationDelay: `${(i + 1) * 150}ms` }}
            >
              <div>
                <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl ${p.color} shadow-sm transition-transform duration-300 group-hover:rotate-3 group-hover:scale-105`}>
                  <p.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-4 text-2xl font-bold tracking-tight text-brand-charcoal">
                  {p.title}
                </h3>
                <p className="text-lg font-medium leading-relaxed text-brand-charcoal/60">
                  {p.body}
                </p>
              </div>
            </div>
          ))}

          {/* ── HOW IT WORKS CARD (Spans 4 cols) ── */}
          <div className="group animate-reveal lg:col-span-4 relative rounded-[2rem] bg-brand-mint-50 p-10 md:p-16 transition-all duration-500 hover:-translate-y-1 hover:shadow-xl" style={{ animationDelay: '600ms' }}>
            <div className="mb-12 flex items-center justify-between border-b border-brand-charcoal/5 pb-8">
              <h2 className="text-[clamp(2rem,4vw,3.5rem)] font-bold leading-none tracking-tighter text-brand-charcoal">
                How It Works <Zap className="inline-block text-brand-orange" size={40} fill="currentColor" />
              </h2>
            </div>
            <HowItWorks />
          </div>

          {/* ── WHAT'S NEXT (Roadmap Cards) ── */}
          <div className="group animate-reveal lg:col-span-2 flex flex-col justify-between rounded-[2rem] bg-[#E0E7FF] p-10 transition-all duration-500 hover:-translate-y-1 hover:shadow-xl" style={{ animationDelay: '750ms' }}>
            <div>
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm transition-transform duration-500 group-hover:-rotate-2 group-hover:scale-105">
                <Home className="h-7 w-7 text-indigo-500" />
              </div>
              <span className="mb-4 inline-block rounded-full bg-white px-3 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-brand-charcoal ring-1 ring-inset ring-brand-charcoal/5">
                Coming Soon
              </span>
              <h3 className="mb-4 text-3xl font-bold tracking-tight text-brand-charcoal">
                Housing Optimization
              </h3>
              <p className="text-lg font-medium text-brand-charcoal/60 leading-relaxed">
                Rental marketplace for travel nurse housing with verified listings and nurse-friendly terms.
              </p>
            </div>
          </div>

          <div className="group animate-reveal lg:col-span-2 flex flex-col justify-between rounded-[2rem] bg-[#FCE7F3] p-10 transition-all duration-500 hover:-translate-y-1 hover:shadow-xl" style={{ animationDelay: '900ms' }}>
            <div>
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm transition-transform duration-500 group-hover:-rotate-2 group-hover:scale-105">
                <Users className="h-7 w-7 text-pink-500" />
              </div>
              <span className="mb-4 inline-block rounded-full bg-white px-3 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-brand-charcoal ring-1 ring-inset ring-brand-charcoal/5">
                Coming Soon
              </span>
              <h3 className="mb-4 text-3xl font-bold tracking-tight text-brand-charcoal">
                RN Community Matching
              </h3>
              <p className="text-lg font-medium text-brand-charcoal/60 leading-relaxed">
                Connect with other travel nurses and find roommates near your next assignment.
              </p>
            </div>
          </div>

          {/* ── BOTTOM CTA CARD ── */}
          <div className="group animate-reveal lg:col-span-4 relative overflow-hidden rounded-[2rem] bg-brand-charcoal p-10 text-center md:p-20 transition-all duration-500 hover:shadow-2xl" style={{ animationDelay: '1050ms' }}>
            <div className="relative z-10 flex flex-col items-center">
              <h2 className="mb-10 text-[clamp(2rem,5vw,4rem)] font-bold leading-tight tracking-tighter text-white">
                See what your next contract is <span className="text-brand-orange underline decoration-wavy underline-offset-8">really</span> worth.
              </h2>
              <CTAButton href="/analyze">
                Analyze My Offer <ArrowRight className="transition-transform duration-300 group-hover/btn:translate-x-1" />
              </CTAButton>
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
