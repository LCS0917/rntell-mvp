import { getSocialProfile } from "@/app/actions/matching";
import { SocialProfileForm } from "@/components/social/SocialProfileForm";
import { UserCog } from "lucide-react";

export const metadata = {
  title: "Social Preferences | RNTell",
};

export default async function SocialProfilePage() {
  const { data } = await getSocialProfile();

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-xl border border-brand-gray-200 bg-brand-peach-50 p-8">
        <div className="flex items-center gap-3">
          <UserCog size={24} className="text-brand-orange" />
          <div>
            <h1 className="text-2xl font-bold text-brand-charcoal">
              Roommate Preferences
            </h1>
            <p className="mt-1 text-sm text-brand-gray-500">
              Set your preferences to find compatible travel roommates.
            </p>
          </div>
        </div>

        <SocialProfileForm initialData={data} />
      </div>
    </div>
  );
}
