import { findRoommates } from "@/app/actions/matching";
import { MatchCard } from "@/components/social/MatchCard";
import { Users, UserCog, SearchX } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Find Roommates | RNTell",
};

export default async function SocialDiscoveryPage() {
  const { data: matches, error } = await findRoommates();

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users size={24} className="text-brand-orange" />
          <div>
            <h1 className="text-2xl font-bold text-brand-charcoal">
              Find Roommates
            </h1>
            <p className="text-sm text-brand-gray-500">
              Travel nurses matched by city, lifestyle, and preferences
            </p>
          </div>
        </div>
        <Link
          href="/nurse/social/profile"
          className="inline-flex items-center gap-2 rounded-lg border border-brand-gray-200 bg-white px-4 py-2 text-sm font-medium text-brand-charcoal hover:bg-brand-gray-100"
        >
          <UserCog size={14} />
          Edit Preferences
        </Link>
      </div>

      {/* Error state */}
      {error && (
        <div className="mt-6 rounded-xl border border-brand-gray-200 bg-brand-peach-50 p-8 text-center">
          <UserCog size={28} className="mx-auto text-brand-orange" />
          <h2 className="mt-3 text-lg font-semibold text-brand-charcoal">
            {error}
          </h2>
          <p className="mt-1 text-sm text-brand-gray-500">
            Tell us your social style, cleanliness preference, and target cities.
          </p>
          <Link
            href="/nurse/social/profile"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-orange px-5 py-2 text-sm font-medium text-white hover:bg-brand-orange-hover"
          >
            <UserCog size={14} />
            Set Up Profile
          </Link>
        </div>
      )}

      {/* Empty state */}
      {!error && matches.length === 0 && (
        <div className="mt-6 rounded-xl border border-brand-gray-200 bg-white p-8 text-center">
          <SearchX size={28} className="mx-auto text-brand-gray-400" />
          <h2 className="mt-3 text-lg font-semibold text-brand-charcoal">
            No matches yet
          </h2>
          <p className="mt-1 text-sm text-brand-gray-500">
            We&apos;ll find roommates as more nurses join. Check back soon!
          </p>
        </div>
      )}

      {/* Match grid */}
      {matches.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {matches.map((match) => (
            <MatchCard key={match.nurse_id} match={match} />
          ))}
        </div>
      )}
    </div>
  );
}
