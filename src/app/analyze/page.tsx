import { Metadata } from "next";
import AnalyzeClient from "./AnalyzeClient";
import Footer from "@/components/ui/Footer";
import Navbar from "@/components/ui/Navbar";

export const metadata: Metadata = {
  title: "Contract Analysis | RNTell",
  description:
    "See how your travel nursing contract compares to GSA market rates. Free, no account required.",
};

export default function AnalyzePage() {
  return (
    <div className="min-h-screen bg-brand-warm">
      <Navbar />
      <AnalyzeClient />
      <Footer />
    </div>
  );
}
