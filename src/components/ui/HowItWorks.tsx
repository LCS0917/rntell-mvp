import { Upload, BarChart3, CheckCircle } from "lucide-react";

const DEFAULT_STEPS = [
  {
    icon: Upload,
    title: "Analyze Your Offer",
    description:
      "Enter your contract details or upload a PDF. Get an instant financial breakdown.",
  },
  {
    icon: BarChart3,
    title: "Compare to Market",
    description:
      "See how your pay, stipends, and benefits compare to GSA benchmarks and market data.",
  },
  {
    icon: CheckCircle,
    title: "Apply Direct",
    description:
      "Apply directly to facilities. No middlemen. No margin on your pay.",
  },
];

const ICONS = [Upload, BarChart3, CheckCircle];

interface HowItWorksProps {
  steps?: { title: string; description: string }[];
}

export default function HowItWorks({ steps }: HowItWorksProps) {
  const items = steps && steps.length === 3
    ? steps.map((s, i) => ({ ...s, icon: ICONS[i] }))
    : DEFAULT_STEPS;

  return (
    <div className="grid gap-8 md:grid-cols-3">
      {items.map((step, i) => (
        <div key={step.title} className="flex flex-col items-center text-center">
          <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-orange/10">
            <step.icon className="h-8 w-8 text-brand-orange" />
            <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-brand-orange text-xs font-bold text-white">
              {i + 1}
            </span>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-brand-charcoal">
            {step.title}
          </h3>
          <p className="text-sm text-brand-gray-500">{step.description}</p>
        </div>
      ))}
    </div>
  );
}
