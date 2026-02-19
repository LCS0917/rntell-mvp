type BgVariant = "white" | "warm" | "charcoal" | "mint" | "peach-gradient";

const bgMap: Record<BgVariant, string> = {
  white: "bg-white",
  warm: "bg-brand-warm",
  charcoal: "bg-[#1A1A1A] text-white",
  mint: "bg-brand-mint-50",
  "peach-gradient": "bg-gradient-to-b from-brand-peach-50 to-brand-warm",
};

export default function SectionContainer({
  bg = "white",
  className = "",
  children,
}: {
  bg?: BgVariant;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`py-16 md:py-24 ${bgMap[bg]} ${className}`}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">{children}</div>
    </section>
  );
}
