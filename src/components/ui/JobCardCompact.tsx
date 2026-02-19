import Link from "next/link";

const SHIFT_LABELS: Record<string, string> = {
  day: "Day",
  night: "Night",
  rotating: "Rotating",
  prn: "PRN",
};

type CompactJob = {
  id: string;
  title: string;
  specialty: string;
  shift_type: string | null;
  pay_package_total: number | null;
  facilities: {
    name: string;
    location_city: string | null;
    location_state: string | null;
  } | null;
};

export default function JobCardCompact({ job }: { job: CompactJob }) {
  const weeklyPay = job.pay_package_total
    ? `$${job.pay_package_total.toLocaleString()}/wk`
    : "Pay TBD";
  const shift = job.shift_type ? SHIFT_LABELS[job.shift_type] || job.shift_type : null;
  const location = job.facilities
    ? [job.facilities.location_city, job.facilities.location_state]
        .filter(Boolean)
        .join(", ")
    : "";

  return (
    <div className="flex min-w-[240px] flex-col rounded-xl border border-brand-gray-200 bg-white p-5 shadow-sm">
      <p className="truncate text-sm font-semibold text-brand-charcoal">
        {job.facilities?.name || "Unknown Facility"}
      </p>
      {location && (
        <p className="mt-0.5 text-xs text-brand-gray-500">{location}</p>
      )}
      <div className="mt-3 flex items-center gap-2 text-xs text-brand-gray-400">
        <span>{job.specialty}</span>
        {shift && (
          <>
            <span className="text-brand-gray-300">|</span>
            <span>{shift}</span>
          </>
        )}
      </div>
      <p className="mt-3 text-lg font-bold text-brand-teal">{weeklyPay}</p>
      <Link
        href={`/jobs/${job.id}`}
        className="mt-4 text-center text-sm font-medium text-brand-orange hover:text-brand-orange-hover"
      >
        View Details
      </Link>
    </div>
  );
}
