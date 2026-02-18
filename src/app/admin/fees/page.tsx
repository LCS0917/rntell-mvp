import { getFeeStats } from "@/app/actions/admin";
import { DollarSign } from "lucide-react";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export default async function AdminFeesPage() {
  const stats = await getFeeStats();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-brand-charcoal">Fees</h1>

      <div className="rounded-xl border border-brand-gray-200 bg-white p-8 text-center">
        <DollarSign size={40} className="mx-auto mb-4 text-brand-gray-300" />
        <p className="text-lg font-semibold text-brand-charcoal">
          Fee tracking is coming once Stripe Connect is configured.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-4 text-left sm:grid-cols-4">
          <div className="rounded-lg bg-brand-gray-100 p-4">
            <p className="text-2xl font-bold text-brand-charcoal">{stats.totalContracts}</p>
            <p className="text-xs text-brand-gray-500">Confirmed Contracts</p>
          </div>
          <div className="rounded-lg bg-brand-gray-100 p-4">
            <p className="text-2xl font-bold text-brand-orange">{formatCurrency(stats.totalFeesOwed)}</p>
            <p className="text-xs text-brand-gray-500">Success Fees Owed</p>
          </div>
          <div className="rounded-lg bg-brand-gray-100 p-4">
            <p className="text-2xl font-bold text-brand-charcoal">{stats.activeRentals}</p>
            <p className="text-xs text-brand-gray-500">Active Rental Agreements</p>
          </div>
          <div className="rounded-lg bg-brand-gray-100 p-4">
            <p className="text-2xl font-bold text-brand-success">{formatCurrency(stats.totalRentalFees)}</p>
            <p className="text-xs text-brand-gray-500">Rental Fees Collected</p>
          </div>
        </div>
      </div>
    </div>
  );
}
