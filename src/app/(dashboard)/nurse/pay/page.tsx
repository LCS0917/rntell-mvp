import { DollarSign } from "lucide-react";
import PayCenterClient from "@/components/pay/PayCenterClient";

export const metadata = {
  title: "Pay Center | RNTell",
};

export default function PayCenterPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-brand-charcoal">
          <DollarSign className="text-brand-orange" size={28} />
          Pay Center
        </h1>
        <p className="mt-1 text-sm text-brand-gray-500">
          Know your worth, see what others earn, and negotiate with data.
        </p>
      </div>

      <PayCenterClient />
    </div>
  );
}
