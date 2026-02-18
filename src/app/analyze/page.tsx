import { Metadata } from "next";
import Link from "next/link";
import AnalyzeClient from "./AnalyzeClient";

export const metadata: Metadata = {
  title: "Contract Analysis | RNTell",
  description:
    "See how your travel nursing contract compares to GSA market rates. Free, no account required.",
};

export default function AnalyzePage() {
  return (
    <div className="min-h-screen bg-brand-warm">
      {/* Minimal header */}
      <header className="border-b border-brand-gray-200 bg-white">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/" className="text-xl font-bold text-brand-orange">
            RNTell
          </Link>
          <span className="text-sm font-medium text-brand-gray-500">
            Contract Analysis
          </span>
        </div>
      </header>

      <AnalyzeClient />
    </div>
  );
}
