"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [authState, setAuthState] = useState<"loading" | "in" | "out">("loading");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setAuthState(user ? "in" : "out");
    });
  }, []);

  return (
    <nav className="sticky top-0 z-50 border-b border-brand-charcoal/5 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-12">
        {/* Logo */}
        <Link
          href="/"
          className="shrink-0 text-2xl font-black tracking-tighter text-brand-orange hover:text-brand-orange-hover transition-colors"
        >
          RNTell
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-8 md:flex">
          <Link
            href="/jobs"
            className="text-xs font-bold uppercase tracking-widest text-brand-charcoal hover:text-brand-orange transition-colors"
          >
            Find Jobs
          </Link>
          <Link
            href="/facilities"
            className="text-xs font-bold uppercase tracking-widest text-brand-charcoal hover:text-brand-orange transition-colors"
          >
            Facilities
          </Link>
          <Link
            href="/analyze"
            className="text-xs font-bold uppercase tracking-widest text-brand-charcoal hover:text-brand-orange transition-colors"
          >
            Analyze
          </Link>
          {authState !== "loading" && (
            <div className="flex items-center gap-4 border-l border-brand-charcoal/10 pl-8">
              {authState === "in" ? (
                <Link
                  href="/dashboard"
                  className="rounded-lg bg-brand-orange px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-brand-orange-hover shadow-sm"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-xs font-bold uppercase tracking-widest text-brand-charcoal hover:text-brand-orange transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/signup"
                    className="rounded-lg bg-brand-orange px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-brand-orange-hover shadow-sm"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden p-2 text-brand-charcoal"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-brand-charcoal/5 bg-white px-6 pb-6 pt-4 md:hidden">
          <div className="flex flex-col gap-4">
            <Link
              href="/jobs"
              onClick={() => setOpen(false)}
              className="text-sm font-semibold text-brand-charcoal hover:text-brand-orange transition-colors"
            >
              Find Jobs
            </Link>
            <Link
              href="/facilities"
              onClick={() => setOpen(false)}
              className="text-sm font-semibold text-brand-charcoal hover:text-brand-orange transition-colors"
            >
              Facilities
            </Link>
            <Link
              href="/analyze"
              onClick={() => setOpen(false)}
              className="text-sm font-semibold text-brand-charcoal hover:text-brand-orange transition-colors"
            >
              Analyze an Offer
            </Link>
            <hr className="border-brand-charcoal/5" />
            {authState === "in" ? (
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="rounded-lg bg-brand-orange px-5 py-3 text-center text-sm font-bold text-white transition-colors hover:bg-brand-orange-hover"
              >
                Dashboard
              </Link>
            ) : authState === "out" ? (
              <>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="text-sm font-semibold text-brand-charcoal hover:text-brand-orange transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setOpen(false)}
                  className="rounded-lg bg-brand-orange px-5 py-3 text-center text-sm font-bold text-white transition-colors hover:bg-brand-orange-hover"
                >
                  Get Started
                </Link>
              </>
            ) : null}
          </div>
        </div>
      )}
    </nav>
  );
}
