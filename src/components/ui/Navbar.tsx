import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="flex h-16 items-center justify-between border-b border-brand-gray-200 bg-white px-6">
      {/* Logo */}
      <Link href="/" className="text-xl font-bold text-brand-orange">
        RNTell
      </Link>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Link
          href="/login"
          className="rounded-lg px-4 py-2 text-sm font-medium text-brand-charcoal transition-colors hover:bg-brand-gray-100"
        >
          Sign In
        </Link>
        <Link
          href="/signup"
          className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-orange-hover"
        >
          Get Started
        </Link>
      </div>
    </nav>
  );
}
