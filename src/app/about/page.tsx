import { Metadata } from "next";
import { DollarSign, Home, ShieldAlert, FileSearch, Users } from "lucide-react";
import Navbar from "@/components/ui/Navbar";
import Footer from "@/components/ui/Footer";
import SectionContainer from "@/components/ui/SectionContainer";
import CTAButton from "@/components/ui/CTAButton";
import HowItWorks from "@/components/ui/HowItWorks";
import ComingSoonCard from "@/components/ui/ComingSoonCard";

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
  },
  {
    icon: Home,
    title: "Stipend Misalignment",
    body: "Housing and meal stipends often don't match GSA rates, creating hidden margin gaps that cost nurses thousands.",
  },
  {
    icon: ShieldAlert,
    title: "Compliance Risk",
    body: "Wage recharacterization and taxability rules are complex and poorly communicated, putting nurses at audit risk.",
  },
  {
    icon: FileSearch,
    title: "Limited Visibility",
    body: "Nurses lack insight into employer classification, 501(c)(3) status, and federal program eligibility like PSLF.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <Navbar />

      {/* ── MISSION ── */}
      <SectionContainer bg="warm" className="py-20 md:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold text-brand-charcoal md:text-5xl">
            Financial Clarity for Every Travel Nurse
          </h1>
          <p className="mt-6 text-lg text-brand-gray-500">
            RNTell is the financial intelligence layer that eliminates pay
            confusion and gives nurses direct access to market data, contract
            analysis, and federal incentive detection — without middlemen taking
            a cut.
          </p>
        </div>
      </SectionContainer>

      {/* ── THE PROBLEM ── */}
      <SectionContainer bg="white">
        <h2 className="mb-12 text-center text-3xl font-bold text-brand-charcoal">
          The Challenges Travel Nurses Face
        </h2>
        <div className="grid gap-8 sm:grid-cols-2">
          {problems.map((p) => (
            <div
              key={p.title}
              className="flex flex-col items-center rounded-xl border border-brand-gray-200 bg-white p-8 text-center shadow-sm"
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-peach-50">
                <p.icon className="h-7 w-7 text-brand-orange" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-brand-charcoal">
                {p.title}
              </h3>
              <p className="text-sm text-brand-gray-500">{p.body}</p>
            </div>
          ))}
        </div>
      </SectionContainer>

      {/* ── HOW IT WORKS ── */}
      <SectionContainer bg="warm">
        <h2 className="mb-12 text-center text-3xl font-bold text-brand-charcoal">
          How It Works
        </h2>
        <HowItWorks />
      </SectionContainer>

      {/* ── ROADMAP ── */}
      <SectionContainer bg="white">
        <h2 className="mb-4 text-center text-3xl font-bold text-brand-charcoal">
          What&apos;s Next
        </h2>
        <p className="mx-auto mb-10 max-w-xl text-center text-brand-gray-500">
          We&apos;re building more tools to support travel nurses beyond
          contracts and jobs.
        </p>
        <div className="mx-auto grid max-w-2xl gap-8 sm:grid-cols-2">
          <ComingSoonCard
            icon={Home}
            title="Housing Optimization"
            description="Rental marketplace for travel nurse housing with verified listings and nurse-friendly terms."
          />
          <ComingSoonCard
            icon={Users}
            title="RN Community & Roommate Matching"
            description="Connect with other travel nurses and find roommates near your next assignment."
          />
        </div>
      </SectionContainer>

      {/* ── BOTTOM CTA ── */}
      <SectionContainer bg="charcoal" className="py-16 md:py-20">
        <div className="text-center">
          <h2 className="mb-6 text-2xl font-bold text-white md:text-3xl">
            See what your next contract is really worth.
          </h2>
          <CTAButton href="/analyze">Analyze My Offer</CTAButton>
        </div>
      </SectionContainer>

      <Footer />
    </div>
  );
}
