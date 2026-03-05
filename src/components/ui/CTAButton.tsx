import Link from "next/link";

type Variant = "solid" | "outline";

export default function CTAButton({
  href,
  variant = "solid",
  className = "",
  children,
}: {
  href: string;
  variant?: Variant;
  className?: string;
  children: React.ReactNode;
}) {
  const base =
    "group/btn inline-flex items-center justify-center gap-2 rounded-xl border-2 px-8 py-4 text-sm font-bold uppercase tracking-widest transition-all hover:-translate-y-1 active:translate-y-0 active:shadow-none";
  
  const variants: Record<Variant, string> = {
    solid: "border-brand-charcoal bg-brand-orange text-white hover:bg-brand-orange-hover shadow-[6px_6px_0_0_oklch(0.20_0.02_40)] hover:shadow-[8px_8px_0_0_oklch(0.20_0.02_40)]",
    outline:
      "border-brand-charcoal bg-white text-brand-charcoal hover:bg-brand-gray-100 shadow-[6px_6px_0_0_oklch(0.20_0.02_40)] hover:shadow-[8px_8px_0_0_oklch(0.20_0.02_40)]",
  };

  return (
    <Link href={href} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </Link>
  );
}
