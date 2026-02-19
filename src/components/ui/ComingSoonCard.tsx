import type { LucideIcon } from "lucide-react";

export default function ComingSoonCard({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-brand-gray-200 bg-brand-gray-100 p-8 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-gray-200">
        <Icon className="h-7 w-7 text-brand-gray-400" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-brand-charcoal">{title}</h3>
      <p className="mb-4 text-sm text-brand-gray-500">{description}</p>
      <span className="inline-block rounded-full bg-brand-gray-200 px-3 py-1 text-xs font-medium text-brand-gray-500">
        Coming Soon
      </span>
    </div>
  );
}
