import { createClient } from "@/utils/supabase/server";
import { getFacilityWithReviews } from "@/app/actions/reviews";
import type { NegotiationLever } from "@/app/actions/reviews";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import {
  MapPin,
  Building2,
  Star,
  ThumbsUp,
  ThumbsDown,
  ShieldCheck,
  DollarSign,
  Zap,
  AlertTriangle,
} from "lucide-react";
import { RatingBar } from "@/components/reviews/RatingBar";
import { ReviewForm } from "@/components/reviews/ReviewForm";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const { facility } = await getFacilityWithReviews(id);
  return {
    title: facility ? `${facility.name} | RNTell` : "Facility | RNTell",
  };
}

export default async function FacilityDetailPage({ params }: Props) {
  const { id } = await params;
  const {
    facility,
    reviews,
    communityReviews,
    aggregate,
    reviewCount,
    salaryAggregate,
    levers,
    gsaBenchmark,
  } = await getFacilityWithReviews(id);

  if (!facility) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  const safetyColor =
    aggregate && aggregate.safety >= 4
      ? "text-brand-green"
      : aggregate && aggregate.safety < 3
        ? "text-brand-danger"
        : "text-brand-orange";

  const payDiff =
    salaryAggregate && gsaBenchmark
      ? salaryAggregate.avgWeeklyPay - gsaBenchmark
      : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* ── Header ── */}
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
            {(facility.location_city || facility.location_state) && (
              <p className="mt-1 flex items-center gap-1 text-sm text-brand-gray-500">
                <MapPin size={14} />
                {[facility.location_city, facility.location_state]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
            {facility.type && (
              <span className="mt-2 inline-block rounded-full bg-brand-gray-100 px-3 py-0.5 text-xs font-medium text-brand-gray-500">
                {facility.type}
              </span>
            )}
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
                {reviewCount} review{reviewCount !== 1 ? "s" : ""}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Data Cards ── */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Trust Card */}
        <div className="rounded-xl border border-brand-gray-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-brand-gray-500">
            <ShieldCheck size={16} className="text-brand-green" />
            Trust Score
          </div>
          {aggregate ? (
            <>
              <p className={`mt-2 text-3xl font-bold ${safetyColor}`}>
                {aggregate.safety}
                <span className="text-base font-normal text-brand-gray-400">
                  /5
                </span>
              </p>
              <p className="mt-1 text-xs text-brand-gray-400">
                Avg Safety Rating
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm text-brand-gray-400">
              No reviews yet
            </p>
          )}
        </div>

        {/* Salary Card */}
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
              <div className="mt-1 flex items-center gap-1 text-xs">
                {payDiff !== null && payDiff < 0 ? (
                  <span className="flex items-center gap-0.5 text-brand-danger">
                    <AlertTriangle size={12} />$
                    {Math.abs(payDiff).toLocaleString()} below GSA benchmark
                  </span>
                ) : (
                  <span className="text-brand-success-dark">
                    ${payDiff?.toLocaleString()} above GSA benchmark
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[10px] text-brand-gray-400">
                GSA Benchmark: ${gsaBenchmark?.toLocaleString()}/wk
                &middot; {salaryAggregate.reportCount} report
                {salaryAggregate.reportCount !== 1 ? "s" : ""}
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm text-brand-gray-400">
              No salary data yet
            </p>
          )}
        </div>

        {/* Levers Card */}
        <div className="rounded-xl border border-brand-gray-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-brand-gray-500">
            <Zap size={16} className="text-brand-orange" />
            Negotiation Levers
          </div>
          {levers.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {levers.map((lever: NegotiationLever) => (
                <li
                  key={lever.id}
                  className="flex items-start gap-2 text-xs text-brand-charcoal"
                >
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-orange" />
                  <span>
                    {lever.description || lever.lever_value || lever.lever_type}
                    {lever.verified_count > 0 && (
                      <span className="ml-1 text-brand-gray-400">
                        ({lever.verified_count} confirmed)
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-brand-gray-400">
              No levers reported
            </p>
          )}
        </div>
      </div>

      {/* ── Rating Bars ── */}
      {aggregate && (
        <div className="rounded-xl border border-brand-gray-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold text-brand-charcoal">
            Rating Breakdown
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <RatingBar label="Safety" value={aggregate.safety} />
            <RatingBar label="Staffing" value={aggregate.staffing} />
            <RatingBar label="Culture" value={aggregate.culture} />
            <RatingBar label="Pay" value={aggregate.pay} />
          </div>
        </div>
      )}

      {/* ── Add Review ── */}
      <ReviewForm facilityId={facility.id} isLoggedIn={isLoggedIn} />

      {/* ── Reviews List ── */}
      {reviews.length === 0 ? (
        <div className="rounded-xl border border-brand-gray-200 bg-white p-8 text-center">
          <Star className="mx-auto text-brand-gray-300" size={40} />
          <h2 className="mt-3 text-lg font-semibold text-brand-charcoal">
            No reviews yet
          </h2>
          <p className="mt-1 text-sm text-brand-gray-500">
            Be the first nurse to review this facility.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-brand-charcoal">
            Nurse Reviews
          </h2>
          {reviews.map((review) => (
            <div
              key={review.id}
              className="rounded-xl border border-brand-gray-200 bg-white p-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        className={
                          i < review.rating_overall
                            ? "fill-brand-orange text-brand-orange"
                            : "text-brand-gray-300"
                        }
                      />
                    ))}
                  </div>
                </div>
                {review.would_return !== null && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      review.would_return
                        ? "bg-brand-green-light text-brand-success-dark"
                        : "bg-brand-danger-light text-brand-danger"
                    }`}
                  >
                    {review.would_return ? (
                      <>
                        <ThumbsUp size={11} /> Would Return
                      </>
                    ) : (
                      <>
                        <ThumbsDown size={11} /> Would Not Return
                      </>
                    )}
                  </span>
                )}
              </div>

              {review.review_body && (
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-brand-gray-500">
                  {review.review_body}
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-4 text-xs text-brand-gray-400">
                {review.rating_safety && (
                  <span>Safety: {review.rating_safety}/5</span>
                )}
                {review.rating_staffing && (
                  <span>Staffing: {review.rating_staffing}/5</span>
                )}
                {review.rating_culture && (
                  <span>Culture: {review.rating_culture}/5</span>
                )}
                {review.rating_pay && (
                  <span>Pay: {review.rating_pay}/5</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    {/* Community Reviews from Reddit */}
      {communityReviews.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-brand-charcoal">
            From the Community
          </h2>
          {communityReviews.map((cr) => (
            <div key={cr.id} className="rounded-xl border border-brand-gray-200 bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <p className="font-medium text-brand-charcoal">{cr.post_title}</p>
                {cr.reddit_url && (
                  <a href={cr.reddit_url} target="_blank" rel="noopener noreferrer"
                    className="shrink-0 flex items-center gap-1 text-xs text-brand-orange hover:underline">
                    <ExternalLink size={12} /> Reddit
                  </a>
                )}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-brand-gray-500 line-clamp-4">{cr.review_text}</p>
              <div className="mt-3 flex items-center gap-3 text-xs text-brand-gray-400">
                {cr.score > 0 && <span>▲ {cr.score} upvotes</span>}
                {cr.posted_at && <span>{new Date(cr.posted_at).toLocaleDateString()}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
