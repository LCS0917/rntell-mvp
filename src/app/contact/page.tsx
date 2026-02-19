import { Metadata } from "next";
import Navbar from "@/components/ui/Navbar";
import Footer from "@/components/ui/Footer";
import SectionContainer from "@/components/ui/SectionContainer";
import ContactForm from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact | RNTell",
  description: "Get in touch with the RNTell team. We'd love to hear from you.",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen">
      <Navbar />

      <SectionContainer bg="warm" className="py-20 md:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold text-brand-charcoal md:text-5xl">
            Get in Touch
          </h1>
          <p className="mt-4 text-lg text-brand-gray-500">
            Have questions? We&apos;d love to hear from you.
          </p>
        </div>
      </SectionContainer>

      <SectionContainer bg="white">
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-10 lg:grid-cols-3">
            {/* Form — 2 cols */}
            <div className="lg:col-span-2">
              <ContactForm />
            </div>

            {/* Sidebar — 1 col */}
            <div className="space-y-6">
              <div className="rounded-xl border border-brand-gray-200 bg-brand-gray-100 p-6">
                <h3 className="mb-2 text-sm font-semibold text-brand-charcoal">
                  Email Us
                </h3>
                <p className="text-sm text-brand-gray-500">
                  support@rntell.com
                </p>
              </div>
              <div className="rounded-xl border border-brand-gray-200 bg-brand-gray-100 p-6">
                <h3 className="mb-2 text-sm font-semibold text-brand-charcoal">
                  Looking for help?
                </h3>
                <p className="text-sm text-brand-gray-500">
                  Check out our job board or try the contract analyzer for
                  instant answers.
                </p>
              </div>
            </div>
          </div>
        </div>
      </SectionContainer>

      <Footer />
    </div>
  );
}
