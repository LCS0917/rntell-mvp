import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  MapPin,
  Star,
  ShieldCheck,
  DollarSign,
  ExternalLink,
  ArrowUpCircle,
  MessageSquare,
  Flag,
} from "lucide-react";
import { getPublicFacilityProfile } from "@/app/actions/facilities";
import { createClient } from "@/utils/supabase/server";
import Footer from "@/components/ui/Footer";
import Navbar from "@/components/ui/Navbar";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const { facility } = await getPublicFacilityProfile(id);
  return {
    title: facility
      ? `${facility.name} | RNTell`
      : "Facility | RNTell",
  };
}

export default async function PublicFacilityPage({ params }: Props) {
  const { id } = await params;
  const { facility, reviews, communityReviews, aggregate, salaryAggregate } =
    await getPublicFacilityProfile(id);

  if (!facility) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const location = [facility.location_city, facility.location_state]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <div className="min-h-screen bg-brand-warm">
        <Navbar />

        <div className="container py-8">
          {/* Back link */}
          <Link
            href="/facilities"
            className="mb-4 inline-flex items-center gap-1 text-sm text-brand-gray-500 hover:text-brand-charcoal"
          >
            &larr; All Facilities
          </Link>

          <div className="mx-auto max-w-3xl space-y-6">
            {/* ── Facility Header ── */}
            <div className="rounded-xl border border-brand-gray-200 bg-white p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="flex items-center gap-2 text-2xl font-bold text-brand-charcoal">
                    <Building2 className="text-brand-orange" size={24} />
                    {facility.name}
                    {facility.is_verified && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-green-light px-2.5 py-0.5 text-xs font-medium text-brand-success-dark">
                        <ShieldCheck size={14} />
                        Verified
                      </span>
                    )}
                  </h1>
                  {location && (
                    <p className="mt-1 flex items-center gap-1 text-sm text-brand-gray-500">
                      <MapPin size={14} />
                      {facility.location_address || location}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {facility.type && (
                      <span className="rounded-full bg-brand-gray-100 px-3 py-0.5 text-xs font-medium text-brand-gray-500">
                        {facility.type}
                      </span>
                    )}
                    {facility.website && (
                      <a
                        href={facility.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-brand-orange hover:underline"
                      >
                        <ExternalLink size={12} />
                        Website
                      </a>
                    )}
                  </div>
                </div>

                {aggregate && (
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-3xl font-bold text-brand-charcoal">
                      <Star
                        className="fill-brand-orange text-brand-orange"
                        size={28}
                      />
                      {aggregate.overall}
                    </div>
                    <p className="text-xs text-brand-gray-500">
                      {aggregate.count} review{aggregate.count !== 1 ? "s" : ""}
                    </p>
                  </div>
                )}
              </div>

              {facility.description && (
                <p className="mt-4 text-sm leading-relaxed text-brand-gray-500">
                  {facility.description}
                </p>
              )}
            </div>

            {/* ── Data Cards ── */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Rating summary */}
              <div className="rounded-xl border border-brand-gray-200 bg-white p-5">
                <div className="flex items-center gap-2 text-sm font-medium text-brand-gray-500">
                  <Star size={16} className="text-brand-orange" />
                  Nurse Ratings
                </div>
                {aggregate ? (
                  <div className="mt-3 space-y-2">
                    <RatingRow label="Safety" value={aggregate.safety} />
                    <RatingRow label="Staffing" value={aggregate.staffing} />
                    <RatingRow label="Culture" value={aggregate.culture} />
                    <RatingRow label="Pay" value={aggregate.pay} />
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-brand-gray-400">
                    No ratings yet
                  </p>
                )}
              </div>

              {/* Pay summary */}
              <div className="rounded-xl border border-brand-gray-200 bg-white p-5">
                <div className="flex items-center gap-2 text-sm font-medium text-brand-gray-500">
                  <DollarSign size={16} className="text-brand-orange" />
                  Avg Weekly Pay
                </div>
                {salaryAggregate ? (
                  <>
                    <p className="mt-2 text-3xl font-bold text-brand-charcoal">
                      ${salaryAggregate.avgWeeklyPay.toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-brand-gray-400">
                      {salaryAggregate.reportCount} salary report
                      {salaryAggregate.reportCount !== 1 ? "s" : ""}
                    </p>
                  </>
                ) : (
                  <p className="mt-3 text-sm text-brand-gray-400">
                    No salary data yet
                  </p>
                )}
              </div>
            </div>

            {/* ── Claim CTA ── */}
            {!facility.is_claimed && (
              <div className="rounded-xl border-2 border-dashed border-brand-orange/30 bg-brand-orange/5 p-6 text-center">
                <Flag className="mx-auto text-brand-orange" size={32} />
                <h2 className="mt-3 text-lg font-semibold text-brand-charcoal">
                  Is this your facility?
                </h2>
                <p className="mt-1 text-sm text-brand-gray-500">
                  Claim this page to manage your profile, respond to reviews,
                  and post jobs directly to nurses.
                </p>
                <Link
                  href={`/signup?role=facility&claim=${facility.id}`}
                  className="mt-4 inline-flex rounded-lg bg-brand-orange px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-orange-hover"
                >
                  Claim This Facility
                </Link>
              </div>
            )}

            {/* ── Community Reviews (Reddit) ── */}
            {communityReviews.length > 0 && (
              <div className="space-y-4">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-brand-charcoal">
                  <MessageSquare size={20} className="text-brand-gray-400" />
                  What Nurses Are Saying
                </h2>
                {communityReviews.map((review) => (
                  <div
                    key={review.id}
                    className="rounded-xl border border-brand-gray-200 bg-white p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-sm font-medium text-brand-charcoal">
                        {review.post_title}
                      </h3>
                      <span className="flex shrink-0 items-center gap-1 text-xs text-brand-gray-400">
                        <ArrowUpCircle size={12} />
                        {review.score}
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-brand-gray-500">
                      {review.review_text.length > 500
                        ? review.review_text.slice(0, 500) + "…"
                        : review.review_text}
                    </p>
                    <div className="mt-3 flex items-center gap-3 text-xs text-brand-gray-400">
                      {review.subreddit && <span>r/{review.subreddit}</span>}
                      {review.posted_at && (
                        <span>
                          {new Date(review.posted_at).toLocaleDateString()}
                        </span>
                      )}
                      {review.reddit_url && (
                        <a
                          href={review.reddit_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-0.5 text-brand-orange hover:underline"
                        >
                          <ExternalLink size={10} />
                          View on Reddit
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Nurse Reviews ── */}
            {reviews.length > 0 ? (
              <div className="space-y-4">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-brand-charcoal">
                  <Star size={20} className="text-brand-orange" />
                  Nurse Reviews
                </h2>
                {reviews.map((review, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-brand-gray-200 bg-white p-5"
                  >
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Star
                          key={j}
                          size={14}
                          className={
                            j < review.rating_overall
                              ? "fill-brand-orange text-brand-orange"
                              : "text-brand-gray-300"
                          }
                        />
                      ))}
                      {review.would_return !== null && (
                        <span
                          className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${
                            review.would_return
                              ? "bg-brand-green-light text-brand-success-dark"
                              : "bg-brand-danger-light text-brand-danger"
                          }`}
                        >
                          {review.would_return
                            ? "Would Return"
                            : "Would Not Return"}
                        </span>
                      )}
                    </div>
                    {review.review_body && (
                      <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-brand-gray-500">
                        {review.review_body}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-brand-gray-400">
                      {new Date(review.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : communityReviews.length === 0 ? (
              <div className="rounded-xl border border-brand-gray-200 bg-white p-8 text-center">
                <Star className="mx-auto text-brand-gray-300" size={40} />
                <h2 className="mt-3 text-lg font-semibold text-brand-charcoal">
                  No reviews yet
                </h2>
                <p className="mt-1 text-sm text-brand-gray-500">
                  Be the first nurse to review this facility.
                </p>
                <Link
                  href={user ? `/facility/${facility.id}` : "/signup"}
                  className="mt-4 inline-flex rounded-lg bg-brand-orange px-6 py-2 text-sm font-semibold text-white hover:bg-brand-orange-hover"
                >
                  {user ? "Write a Review" : "Sign Up to Review"}
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

function RatingRow({ label, value }: { label: string; value: number }) {
  const pct = (value / 5) * 100;
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 text-xs text-brand-gray-500">{label}</span>
      <div className="h-2 flex-1 rounded-full bg-brand-gray-100">
        <div
          className="h-2 rounded-full bg-brand-orange"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-right text-xs font-medium text-brand-charcoal">
        {value}
      </span>
    </div>
  );
}
