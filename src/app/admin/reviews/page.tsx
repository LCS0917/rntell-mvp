import { getCommunityReviews, getFacilityList } from "@/app/actions/admin";
import { ReviewsClient } from "./ReviewsClient";

export default async function AdminReviewsPage() {
  const [reviews, facilities] = await Promise.all([
    getCommunityReviews("all"),
    getFacilityList(),
  ]);

  return <ReviewsClient reviews={reviews} facilities={facilities} />;
}
