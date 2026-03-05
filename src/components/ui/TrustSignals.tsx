import { DollarSign, ShieldCheck, Award, Building2 } from "lucide-react";

const signals = [
  { icon: DollarSign, label: "See your real take-home" },
  { icon: ShieldCheck, label: "GSA stipend comparison" },
  { icon: Award, label: "Federal eligibility detection" },
  { icon: Building2, label: "Direct facility applications" },
];

export default function TrustSignals() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
      {signals.map((s) => (
        <div
          key={s.label}
          className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-widest text-brand-charcoal/40 transition-colors hover:text-brand-charcoal"
        >
          <s.icon className="h-4 w-4 text-brand-orange/60" />
          {s.label}
        </div>
      ))}
    </div>
  );
}
