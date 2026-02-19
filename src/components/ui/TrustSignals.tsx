import { DollarSign, ShieldCheck, Award, Building2 } from "lucide-react";

const signals = [
  { icon: DollarSign, label: "See your real take-home" },
  { icon: ShieldCheck, label: "GSA stipend comparison" },
  { icon: Award, label: "Federal eligibility detection" },
  { icon: Building2, label: "Direct facility applications" },
];

export default function TrustSignals() {
  return (
    <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
      {signals.map((s) => (
        <div
          key={s.label}
          className="flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm font-medium text-brand-charcoal shadow-sm"
        >
          <s.icon className="h-4 w-4 text-brand-orange" />
          {s.label}
        </div>
      ))}
    </div>
  );
}
