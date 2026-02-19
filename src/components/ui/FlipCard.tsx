import type { ReactNode } from "react";

export default function FlipCard({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl bg-white p-8 text-center shadow-sm">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-mint-100">
        {icon}
      </div>
      <h3 className="mb-2 text-lg font-semibold text-brand-charcoal">{title}</h3>
      <p className="text-sm text-brand-gray-500">{subtitle}</p>
    </div>
  );
}
