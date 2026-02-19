import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-footer-bg px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Explore */}
          <div>
            <h4 className="mb-4 text-sm font-semibold tracking-wide text-white uppercase">
              Explore
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/jobs" className="text-sm text-footer-text hover:text-white">
                  Job Board
                </Link>
              </li>
              <li>
                <Link href="/analyze" className="text-sm text-footer-text hover:text-white">
                  Analyze an Offer
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="mb-4 text-sm font-semibold tracking-wide text-white uppercase">
              Company
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-sm text-footer-text hover:text-white">
                  About
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-footer-text hover:text-white">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="mb-4 text-sm font-semibold tracking-wide text-white uppercase">
              Account
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/login" className="text-sm text-footer-text hover:text-white">
                  Sign In
                </Link>
              </li>
              <li>
                <Link href="/signup" className="text-sm text-footer-text hover:text-white">
                  Get Started
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="mb-4 text-sm font-semibold tracking-wide text-white uppercase">
              Legal
            </h4>
            <ul className="space-y-2">
              <li>
                <span className="text-sm text-footer-text">Privacy Policy</span>
              </li>
              <li>
                <span className="text-sm text-footer-text">Terms of Service</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6">
          <p className="text-center text-xs text-footer-text">
            &copy; {new Date().getFullYear()} RNTell. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
