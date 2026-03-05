import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 flex h-20 items-center justify-between border-b border-brand-charcoal/5 bg-white/80 px-6 backdrop-blur-md lg:px-12">
      {/* Logo */}
      <Link href="/" className="text-2xl font-black tracking-tighter text-brand-charcoal hover:text-brand-orange transition-colors">
        RNTELL.
      </Link>

      {/* Nav links + actions */}
      <div className="flex items-center gap-8">
        <Link
          href="/jobs"
          className="hidden text-xs font-bold uppercase tracking-widest text-brand-charcoal/60 hover:text-brand-charcoal transition-colors md:block"
        >
          Find Jobs
        </Link>
        <Link
          href="/analyze"
          className="hidden text-xs font-bold uppercase tracking-widest text-brand-charcoal/60 hover:text-brand-charcoal transition-colors md:block"
        >
          Analyze
        </Link>
        <div className="flex items-center gap-4 border-l border-brand-charcoal/10 pl-8">
          <Link
            href="/login"
            className="text-xs font-bold uppercase tracking-widest text-brand-charcoal hover:text-brand-orange transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-brand-orange px-5 py-2 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-brand-orange-hover shadow-sm"
          >
            Start
          </Link>
        </div>
      </div>
    </nav>
  );
}
