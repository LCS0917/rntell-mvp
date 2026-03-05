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
    border: "border-brand-peach-200"
  },
  {
    icon: Home,
    title: "Stipend Misalignment",
    body: "Housing and meal stipends often don't match GSA rates, creating hidden margin gaps that cost nurses thousands.",
    color: "bg-brand-mint-50 text-[#66BB6A]",
    border: "border-brand-mint-200"
  },
  {
    icon: ShieldAlert,
    title: "Compliance Risk",
    body: "Wage recharacterization and taxability rules are complex and poorly communicated, putting nurses at audit risk.",
    color: "bg-red-50 text-red-500",
    border: "border-red-200"
  },
  {
    icon: FileSearch,
    title: "Limited Visibility",
    body: "Nurses lack insight into employer classification, 501(c)(3) status, and federal program eligibility like PSLF.",
    color: "bg-blue-50 text-blue-500",
    border: "border-blue-200"
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-brand-warm selection:bg-brand-orange selection:text-white font-sans overflow-x-hidden">
      <Navbar />

      <main className="mx-auto max-w-[1400px] px-6 py-12 md:px-12 md:py-20 lg:px-24">
        
        {/* BENTO GRID */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          
          {/* ── HERO / MISSION CARD (Spans full width) ── */}
          <div className="group animate-reveal lg:col-span-4 relative overflow-hidden rounded-[2rem] border-2 border-brand-charcoal bg-white p-10 md:p-16 lg:p-24 transition-transform duration-500 hover:-translate-y-1 hover:shadow-[0_20px_0_0_oklch(0.20_0.02_40)]">
            {/* Decorative background blobs */}
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand-peach-200/40 blur-3xl transition-transform duration-700 group-hover:scale-150" />
            <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-brand-mint-200/40 blur-3xl transition-transform duration-700 group-hover:scale-150" />
            
            <div className="relative z-10 max-w-4xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border-2 border-brand-charcoal bg-brand-orange px-4 py-2 font-mono text-sm font-bold uppercase tracking-widest text-white shadow-[4px_4px_0_0_oklch(0.20_0.02_40)]">
                <Sparkles size={16} className="animate-pulse" /> Our Mission
              </div>
              <h1 className="text-[clamp(2.5rem,6vw,5.5rem)] font-extrabold leading-[0.9] tracking-tighter text-brand-charcoal">
                Financial <span className="text-brand-orange">Clarity</span> <br className="hidden md:block"/>
                for Every Travel Nurse.
              </h1>
              <p className="mt-8 max-w-2xl text-[clamp(1.125rem,2vw,1.5rem)] font-medium leading-snug text-brand-charcoal/70">
                RNTell is the financial intelligence layer that eliminates pay confusion. We give nurses direct access to market data, contract analysis, and federal incentive detection — without middlemen taking a cut.
              </p>
            </div>
          </div>

          {/* ── PROBLEM CARDS (1 column each on desktop) ── */}
          {problems.map((p, i) => (
            <div 
              key={p.title}
              className={`group animate-reveal relative flex flex-col justify-between overflow-hidden rounded-3xl border-2 border-brand-charcoal bg-white p-8 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_12px_0_0_oklch(0.20_0.02_40)]`}
              style={{ animationDelay: `${(i + 1) * 150}ms` }}
            >
              <div>
                <div className={`mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-brand-charcoal ${p.color} shadow-[4px_4px_0_0_oklch(0.20_0.02_40)] transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110`}>
                  <p.icon className="h-8 w-8" />
                </div>
                <h3 className="mb-4 text-2xl font-extrabold tracking-tight text-brand-charcoal">
                  {p.title}
                </h3>
                <p className="text-lg font-medium leading-relaxed text-brand-charcoal/70">
                  {p.body}
                </p>
              </div>
            </div>
          ))}

          {/* ── HOW IT WORKS CARD (Spans 3 cols, or full width on small) ── */}
          <div className="group animate-reveal lg:col-span-4 relative rounded-[2rem] border-2 border-brand-charcoal bg-brand-mint-50 p-10 md:p-16 transition-all duration-500 hover:shadow-[0_16px_0_0_oklch(0.20_0.02_40)]" style={{ animationDelay: '600ms' }}>
            <div className="mb-12 flex items-center justify-between border-b-2 border-brand-charcoal/10 pb-8">
              <h2 className="text-[clamp(2rem,4vw,3.5rem)] font-extrabold leading-none tracking-tighter text-brand-charcoal">
                How It Works <Zap className="inline-block text-brand-orange animate-bounce" size={40} fill="currentColor" />
              </h2>
            </div>
            {/* The HowItWorks component uses its own grid, which fits perfectly here */}
            <HowItWorks />
          </div>

          {/* ── WHAT'S NEXT (Roadmap Cards) ── */}
          <div className="group animate-reveal lg:col-span-2 flex flex-col justify-between rounded-[2rem] border-2 border-brand-charcoal bg-[#E0E7FF] p-10 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_12px_0_0_oklch(0.20_0.02_40)]" style={{ animationDelay: '750ms' }}>
            <div>
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-brand-charcoal bg-white shadow-[4px_4px_0_0_oklch(0.20_0.02_40)] transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110">
                <Home className="h-8 w-8 text-indigo-500" />
              </div>
              <span className="mb-4 inline-block rounded-full border-2 border-brand-charcoal bg-white px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest text-brand-charcoal">
                Coming Soon
              </span>
              <h3 className="mb-4 text-3xl font-extrabold tracking-tight text-brand-charcoal">
                Housing Optimization
              </h3>
              <p className="text-lg font-medium text-brand-charcoal/70">
                Rental marketplace for travel nurse housing with verified listings and nurse-friendly terms.
              </p>
            </div>
          </div>

          <div className="group animate-reveal lg:col-span-2 flex flex-col justify-between rounded-[2rem] border-2 border-brand-charcoal bg-[#FCE7F3] p-10 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_12px_0_0_oklch(0.20_0.02_40)]" style={{ animationDelay: '900ms' }}>
            <div>
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-brand-charcoal bg-white shadow-[4px_4px_0_0_oklch(0.20_0.02_40)] transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110">
                <Users className="h-8 w-8 text-pink-500" />
              </div>
              <span className="mb-4 inline-block rounded-full border-2 border-brand-charcoal bg-white px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest text-brand-charcoal">
                Coming Soon
              </span>
              <h3 className="mb-4 text-3xl font-extrabold tracking-tight text-brand-charcoal">
                RN Community Matching
              </h3>
              <p className="text-lg font-medium text-brand-charcoal/70">
                Connect with other travel nurses and find roommates near your next assignment.
              </p>
            </div>
          </div>

          {/* ── BOTTOM CTA CARD ── */}
          <div className="group animate-reveal lg:col-span-4 relative overflow-hidden rounded-[2rem] border-2 border-brand-charcoal bg-brand-charcoal p-10 text-center md:p-20 transition-all duration-500 hover:shadow-[0_20px_0_0_oklch(0.65_0.22_40)] hover:border-brand-orange" style={{ animationDelay: '1050ms' }}>
            {/* Playful background element */}
            <Wrench className="absolute -right-10 -top-10 h-64 w-64 text-brand-warm/5 opacity-20 transition-transform duration-1000 group-hover:rotate-45 group-hover:scale-110" />
            
            <div className="relative z-10 flex flex-col items-center">
              <h2 className="mb-8 text-[clamp(2rem,5vw,4.5rem)] font-extrabold leading-tight tracking-tighter text-white">
                See what your next contract is <span className="text-brand-orange underline decoration-wavy underline-offset-8">really</span> worth.
              </h2>
              <CTAButton href="/analyze" className="group/btn flex items-center gap-2 border-2 border-transparent hover:border-white shadow-[8px_8px_0_0_oklch(0.98_0.01_40)] text-lg px-10 py-4 transition-all hover:translate-y-1 hover:shadow-[4px_4px_0_0_oklch(0.98_0.01_40)] bg-brand-orange text-white">
                Analyze My Offer <ArrowRight className="transition-transform duration-300 group-hover/btn:translate-x-2" />
              </CTAButton>
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
