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
    "group/btn inline-flex items-center justify-center gap-2 rounded-xl px-8 py-4 text-sm font-bold uppercase tracking-widest transition-all hover:-translate-y-0.5 active:translate-y-0";
  
  const variants: Record<Variant, string> = {
    solid: "bg-brand-orange text-white hover:bg-brand-orange-hover shadow-sm hover:shadow-md",
    outline:
      "bg-white text-brand-charcoal hover:bg-brand-gray-50 shadow-sm hover:shadow-md ring-1 ring-inset ring-brand-charcoal/10",
  };

  return (
    <Link href={href} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </Link>
  );
}
