import Link from "next/link";
import { DollarSign, Users, Briefcase, ShieldCheck, Ban, Heart } from "lucide-react";
import Navbar from "@/components/ui/Navbar";

const features = [
  {
    icon: DollarSign,
    title: "Verified Salary Data",
    description: "See real GSA rates and agency gaps.",
  },
  {
    icon: Users,
    title: "Roaming RN Social",
    description: "Find roommates and community.",
  },
  {
    icon: Briefcase,
    title: "Direct Hire",
    description: "Zero agency fees. Higher pay for you.",
  },
];

const stats = [
  { icon: ShieldCheck, label: "100% Verified Data" },
  { icon: Ban, label: "Zero Agency Margins" },
  { icon: Heart, label: "Nurse-First Design" },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      <Navbar />

      {/* ── HERO ── */}
      <section className="bg-gradient-to-b from-brand-peach-50 to-brand-warm px-6 py-24 md:py-32">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold leading-tight text-brand-charcoal md:text-5xl">
            Know your worth. Find your place.
            <br className="hidden sm:block" /> Connect directly.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-brand-gray-500">
            The direct-to-facility marketplace that eliminates the middleman
            agency.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="w-full rounded-lg bg-brand-orange px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-brand-orange-hover sm:w-auto"
            >
              I&apos;m a Nurse
            </Link>
            <Link
              href="/signup"
              className="w-full rounded-lg border-2 border-brand-orange px-8 py-3 text-base font-semibold text-brand-orange transition-colors hover:bg-brand-orange hover:text-white sm:w-auto"
            >
              I&apos;m a Facility
            </Link>
          </div>
        </div>
      </section>

      {/* ── VALUE PROP ── */}
      <section className="bg-brand-mint-50 px-6 py-20 md:py-24">
        <div className="container mx-auto max-w-5xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-brand-charcoal">
            The Transparency Engine
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="flex flex-col items-center rounded-xl bg-white p-8 text-center shadow-sm"
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-mint-100">
                  <feature.icon className="h-7 w-7 text-brand-success-dark" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-brand-charcoal">
                  {feature.title}
                </h3>
                <p className="text-sm text-brand-gray-500">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST & STATS ── */}
      <section className="bg-brand-warm px-6 py-16 md:py-20">
        <div className="container mx-auto max-w-4xl">
          <div className="grid gap-8 sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center text-center">
                <stat.icon className="mb-3 h-8 w-8 text-brand-orange" />
                <span className="text-lg font-semibold text-brand-charcoal">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
