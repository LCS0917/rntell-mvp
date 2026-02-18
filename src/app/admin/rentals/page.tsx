import { getRentalStats } from "@/app/actions/admin";
import { Home } from "lucide-react";

export default async function AdminRentalsPage() {
  const stats = await getRentalStats();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-brand-charcoal">Rental Listings</h1>

      <div className="rounded-xl border border-brand-gray-200 bg-white p-8 text-center">
        <Home size={40} className="mx-auto mb-4 text-brand-gray-300" />
        <p className="text-lg font-semibold text-brand-charcoal">
          Rental listing management is coming soon.
        </p>
        <p className="mt-2 text-sm text-brand-gray-500">
          Total rental listings in the database:{" "}
          <span className="font-bold text-brand-charcoal">{stats.totalListings}</span>
        </p>
      </div>
    </div>
  );
}
