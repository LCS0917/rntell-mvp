import { getFacilitiesList } from "@/app/actions/salary";
import { SalarySubmitForm } from "@/components/salary/SalarySubmitForm";

export const metadata = {
  title: "Submit Salary Report | RNTell",
};

export default async function SalarySubmitPage() {
  const { data: facilities } = await getFacilitiesList();

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-xl border border-brand-gray-200 bg-brand-peach-50 p-8">
        <h1 className="text-2xl font-bold text-brand-charcoal">
          Submit Your Pay Report
        </h1>
        <p className="mt-1 text-sm text-brand-gray-500">
          Your report is anonymous and helps other nurses negotiate fair
          compensation.
        </p>

        <SalarySubmitForm facilities={facilities} />
      </div>
    </div>
  );
}
