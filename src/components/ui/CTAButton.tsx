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
    "inline-flex items-center justify-center rounded-lg px-8 py-3 text-base font-semibold transition-colors";
  const variants: Record<Variant, string> = {
    solid: "bg-brand-orange text-white hover:bg-brand-orange-hover",
    outline:
      "border-2 border-brand-orange text-brand-orange hover:bg-brand-orange hover:text-white",
  };

  return (
    <Link href={href} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </Link>
  );
}
