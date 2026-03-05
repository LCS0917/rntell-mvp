"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  MapPin,
  Search,
  Star,
  MessageSquare,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import type { PublicFacility } from "@/app/actions/facilities";
import Navbar from "@/components/ui/Navbar";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

export function FacilityDirectoryClient({
  facilities,
  total,
  isLoggedIn,
}: {
  facilities: PublicFacility[];
  total: number;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/facilities?${params.toString()}`);
  }

  return (
    <div className="min-h-screen bg-brand-warm">
      <Navbar />

      {/* Page title */}
      <div className="container py-8">
        <div className="flex items-center gap-3">
          <Building2 className="text-brand-orange" size={28} />
          <div>
            <h1 className="text-2xl font-bold text-brand-charcoal">
              Facility Directory
            </h1>
            <p className="text-sm text-brand-gray-500">
              {total} hospitals &amp; medical centers
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray-400"
            />
            <input
              type="text"
              placeholder="Search by name..."
              defaultValue={searchParams.get("search") || ""}
              onChange={(e) => {
                const val = e.target.value;
                const timeout = setTimeout(() => updateFilter("search", val), 400);
                return () => clearTimeout(timeout);
              }}
              className="w-full rounded-lg border border-brand-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-brand-orange focus:outline-none"
            />
          </div>
          <select
            defaultValue={searchParams.get("state") || ""}
            onChange={(e) => updateFilter("state", e.target.value)}
            className="rounded-lg border border-brand-gray-200 bg-white px-4 py-2.5 text-sm focus:border-brand-orange focus:outline-none"
          >
            <option value="">All States</option>
            {US_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Facility cards */}
        {facilities.length === 0 ? (
          <div className="mt-12 text-center">
            <Building2 className="mx-auto text-brand-gray-300" size={48} />
            <h2 className="mt-4 text-lg font-semibold text-brand-charcoal">
              No facilities found
            </h2>
            <p className="mt-1 text-sm text-brand-gray-500">
              Try adjusting your search or state filter.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {facilities.map((facility) => (
              <Link
                key={facility.id}
                href={`/facilities/${facility.id}`}
                className="group rounded-xl border border-brand-gray-200 bg-white p-5 transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <h3 className="text-sm font-semibold text-brand-charcoal group-hover:text-brand-orange">
                    {facility.name}
                  </h3>
                  {facility.is_verified && (
                    <ShieldCheck
                      size={16}
                      className="shrink-0 text-brand-green"
                    />
                  )}
                </div>

                {(facility.location_city || facility.location_state) && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-brand-gray-500">
                    <MapPin size={12} />
                    {[facility.location_city, facility.location_state]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                )}

                {facility.type && (
                  <span className="mt-2 inline-block rounded-full bg-brand-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-brand-gray-500">
                    {facility.type}
                  </span>
                )}

                <div className="mt-3 flex items-center gap-4 border-t border-brand-gray-200 pt-3 text-xs text-brand-gray-400">
                  {facility.reviews_count > 0 && (
                    <span className="flex items-center gap-1">
                      <Star size={12} className="text-brand-orange" />
                      {facility.reviews_count} review
                      {facility.reviews_count !== 1 ? "s" : ""}
                    </span>
                  )}
                  {facility.community_reviews_count > 0 && (
                    <span className="flex items-center gap-1">
                      <MessageSquare size={12} />
                      {facility.community_reviews_count} discussion
                      {facility.community_reviews_count !== 1 ? "s" : ""}
                    </span>
                  )}
                  {facility.reviews_count === 0 &&
                    facility.community_reviews_count === 0 && (
                      <span>No reviews yet</span>
                    )}
                  {facility.website && (
                    <ExternalLink size={12} className="ml-auto" />
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
