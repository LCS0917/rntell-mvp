import { TrendingUp } from "lucide-react";
import PayIntelligenceClient from "@/components/intelligence/PayIntelligenceClient";

export const metadata = {
  title: "Pay Intelligence | RNTell",
};

export default function PayIntelligencePage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-brand-charcoal">
          <TrendingUp className="text-brand-green" size={28} />
          Pay Intelligence
        </h1>
        <p className="mt-1 text-sm text-brand-gray-500">
          Know your worth. Negotiate with data, not guesswork.
        </p>
      </div>

      <PayIntelligenceClient />
    </div>
  );
}
