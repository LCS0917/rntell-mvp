import { Metadata } from "next";
import { getPublicFacilities } from "@/app/actions/facilities";
import type { FacilityFilters } from "@/app/actions/facilities";
import { createClient } from "@/utils/supabase/server";
import { FacilityDirectoryClient } from "./FacilityDirectoryClient";
import Footer from "@/components/ui/Footer";

export const metadata: Metadata = {
  title: "Hospital & Facility Directory | RNTell",
  description:
    "Browse hospitals and medical facilities. Read nurse reviews, check pay data, and claim your facility page.",
};

type Props = {
  searchParams: Promise<Record<string, string | string[]>>;
};

export default async function FacilitiesPage({ searchParams }: Props) {
  const params = await searchParams;

  const toString = (v: string | string[] | undefined): string => {
    if (!v) return "";
    return Array.isArray(v) ? v[0] : v;
  };

  const filters: FacilityFilters = {
    search: toString(params.search),
    state: toString(params.state),
  };

  const result = await getPublicFacilities(filters);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <FacilityDirectoryClient
        facilities={result.data}
        total={result.total}
        isLoggedIn={!!user}
      />
      <Footer />
    </>
  );
}
