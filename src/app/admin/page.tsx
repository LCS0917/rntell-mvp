import { getOverviewStats, getActivityFeed } from "@/app/actions/admin";
import Link from "next/link";
import {
  Users,
  Building2,
  Briefcase,
  FileSearch,
  Send,
} from "lucide-react";

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: number;
  sub?: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-xl border border-brand-gray-200 bg-white p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-gray-100">
          <Icon size={20} className="text-brand-gray-500" />
        </div>
        <div>
          <p className="text-2xl font-bold text-brand-charcoal">{value}</p>
          <p className="text-sm text-brand-gray-500">{label}</p>
        </div>
      </div>
      {sub && <p className="mt-2 text-xs text-brand-gray-400">{sub}</p>}
    </div>
  );
}

function typeColor(type: string) {
  switch (type) {
    case "signup":
      return "bg-blue-100 text-blue-700";
    case "facility":
      return "bg-purple-100 text-purple-700";
    case "analysis":
      return "bg-amber-100 text-amber-700";
    case "application":
      return "bg-green-100 text-green-700";
    default:
      return "bg-brand-gray-100 text-brand-gray-500";
  }
}

export default async function AdminOverviewPage() {
  const [stats, feed] = await Promise.all([getOverviewStats(), getActivityFeed()]);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-brand-charcoal">Overview</h1>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Total Nurses"
          value={stats.totalNurses}
          icon={Users}
        />
        <StatCard
          label="Total Facilities"
          value={stats.totalFacilities}
          sub={`${stats.facilitiesClaimed} claimed · ${stats.facilitiesUnclaimed} unclaimed`}
          icon={Building2}
        />
        <StatCard
          label="Job Listings"
          value={stats.totalJobs}
          sub={`${stats.jobsScraped} scraped · ${stats.jobsDirect} direct`}
          icon={Briefcase}
        />
        <StatCard
          label="Contract Analyses"
          value={stats.totalAnalyses}
          sub={`${stats.analysesAnonymous} anonymous · ${stats.analysesClaimed} claimed`}
          icon={FileSearch}
        />
        <StatCard
          label="Applications"
          value={stats.totalApplications}
          icon={Send}
        />
      </div>

      {/* Activity feed */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-brand-charcoal">
          Recent Activity
        </h2>
        <div className="rounded-xl border border-brand-gray-200 bg-white">
          {feed.length === 0 ? (
            <p className="p-6 text-sm text-brand-gray-400">No activity yet.</p>
          ) : (
            <ul className="divide-y divide-brand-gray-200">
              {feed.map((item) => (
                <li key={`${item.type}-${item.id}`} className="flex items-center gap-4 px-5 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${typeColor(item.type)}`}
                  >
                    {item.type}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm text-brand-charcoal">
                      {item.description}
                    </p>
                    <p className="truncate text-xs text-brand-gray-400">{item.who}</p>
                  </div>
                  <span className="shrink-0 text-xs text-brand-gray-400">
                    {new Date(item.when).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                  <Link
                    href={item.link}
                    className="shrink-0 text-xs font-medium text-brand-orange hover:underline"
                  >
                    View
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
