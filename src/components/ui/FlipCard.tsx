"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronDown } from "lucide-react";

export default function FlipCard({
  icon: Icon,
  title,
  subtitle,
  backContent,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  backContent: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      {/* Desktop: 3D flip on hover */}
      <div
        className="hidden md:block"
        style={{ perspective: "1000px" }}
        role="group"
        aria-label={title}
      >
        <div
          className="relative h-64 transition-transform duration-300 [transform-style:preserve-3d] hover:[transform:rotateY(180deg)]"
        >
          {/* Front */}
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-white p-8 text-center shadow-sm [backface-visibility:hidden]">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-mint-100">
              <Icon className="h-7 w-7 text-brand-success-dark" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-brand-charcoal">
              {title}
            </h3>
            <p className="text-sm text-brand-gray-500">{subtitle}</p>
          </div>
          {/* Back */}
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-brand-charcoal p-8 text-center [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <p className="text-sm leading-relaxed text-white">{backContent}</p>
          </div>
        </div>
      </div>

      {/* Mobile: tap-to-expand accordion */}
      <div className="md:hidden" role="group" aria-label={title}>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full flex-col items-center rounded-xl bg-white p-8 text-center shadow-sm"
          aria-expanded={expanded}
        >
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-mint-100">
            <Icon className="h-7 w-7 text-brand-success-dark" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-brand-charcoal">
            {title}
          </h3>
          <p className="text-sm text-brand-gray-500">{subtitle}</p>
          <ChevronDown
            className={`mt-3 h-5 w-5 text-brand-gray-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          />
        </button>
        <div
          className={`overflow-hidden transition-all duration-300 ${expanded ? "mt-2 max-h-40 opacity-100" : "max-h-0 opacity-0"}`}
        >
          <div className="rounded-xl bg-brand-charcoal p-6 text-center">
            <p className="text-sm leading-relaxed text-white">{backContent}</p>
          </div>
        </div>
      </div>
    </>
  );
}
