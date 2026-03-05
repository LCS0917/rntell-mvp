import Navbar from "@/components/ui/Navbar";

export default function FacilityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-4xl px-6 py-8">{children}</main>
    </>
  );
}
