"use client";

import { useCallback, useRef, useState } from "react";
import { analyzeContract, type AnalysisResult, type ContractInput } from "@/app/actions/analyze";
import { parsePdfContract } from "@/app/actions/parsePdf";
import { SPECIALTIES, STATES, SHIFT_TYPES } from "@/lib/constants";
import Link from "next/link";
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  FileText,
  Upload,
  ArrowRight,
  Loader2,
  Info,
  CheckCircle2,
  PenLine,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FormData = {
  facility_name: string;
  city: string;
  state: string;
  specialty: string;
  shift_type: string;
  contract_weeks: string;
  start_date: string;
  hourly_rate: string;
  stipend_housing: string;
  stipend_meals: string;
  travel_reimbursement: string;
};

const emptyForm: FormData = {
  facility_name: "",
  city: "",
  state: "",
  specialty: "",
  shift_type: "",
  contract_weeks: "13",
  start_date: "",
  hourly_rate: "",
  stipend_housing: "",
  stipend_meals: "",
  travel_reimbursement: "",
};

type Tab = "manual" | "pdf";

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function AnalyzeClient() {
  const [tab, setTab] = useState<Tab>("manual");
  const [form, setForm] = useState<FormData>(emptyForm);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // PDF-specific state
  const [pdfParsing, setPdfParsing] = useState(false);
  const [pdfExtracted, setPdfExtracted] = useState(false);
  const [rawContractText, setRawContractText] = useState<string | null>(null);

  const updateForm = (fields: Partial<FormData>) =>
    setForm((prev) => ({ ...prev, ...fields }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!form.city.trim() || !form.state || !form.hourly_rate) {
      setError("City, state, and hourly rate are required.");
      setLoading(false);
      return;
    }

    const input: ContractInput = {
      facility_name: form.facility_name || undefined,
      city: form.city.trim(),
      state: form.state,
      specialty: form.specialty || undefined,
      shift_type: form.shift_type || undefined,
      contract_weeks: form.contract_weeks ? parseInt(form.contract_weeks) : 13,
      start_date: form.start_date || undefined,
      hourly_rate: parseFloat(form.hourly_rate),
      stipend_housing: form.stipend_housing ? parseFloat(form.stipend_housing) : undefined,
      stipend_meals: form.stipend_meals ? parseFloat(form.stipend_meals) : undefined,
      travel_reimbursement: form.travel_reimbursement
        ? parseFloat(form.travel_reimbursement)
        : undefined,
      input_method: pdfExtracted ? "pdf_upload" : "manual",
      raw_contract_text: rawContractText ?? undefined,
    };

    const res = await analyzeContract(input);

    if (res.error) {
      setError(res.error);
    } else if (res.data) {
      setResult(res.data);
    }

    setLoading(false);
  };

  const handlePdfUpload = async (file: File) => {
    setError(null);
    setPdfParsing(true);

    const fd = new FormData();
    fd.append("file", file);

    const res = await parsePdfContract(fd);

    if (res.error) {
      setError(res.error);
      setPdfParsing(false);
      return;
    }

    if (res.data) {
      const f = res.data.extractedFields;
      setRawContractText(res.data.rawText);
      updateForm({
        facility_name: f.facility_name ?? "",
        city: f.city ?? "",
        state: f.state ?? "",
        specialty: f.specialty ?? "",
        hourly_rate: f.hourly_rate != null ? String(f.hourly_rate) : "",
        stipend_housing: f.stipend_housing != null ? String(f.stipend_housing) : "",
        stipend_meals: f.stipend_meals != null ? String(f.stipend_meals) : "",
        travel_reimbursement: f.travel_reimbursement != null ? String(f.travel_reimbursement) : "",
        contract_weeks: f.contract_weeks != null ? String(f.contract_weeks) : "13",
        start_date: f.start_date ?? "",
      });
      setPdfExtracted(true);
    }

    setPdfParsing(false);
  };

  // Show results
  if (result) {
    return (
      <ResultsDisplay
        result={result}
        onStartOver={() => {
          setResult(null);
          setForm(emptyForm);
          setPdfExtracted(false);
          setRawContractText(null);
          setTab("manual");
        }}
      />
    );
  }

  return (
    <main className="container max-w-2xl py-10">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-brand-charcoal">
          Analyze Your Contract
        </h1>
        <p className="mt-2 text-brand-gray-500">
          Enter your travel nursing offer details and see how it compares to GSA
          market rates. Free, no account needed.
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="mb-6 flex rounded-lg border border-brand-gray-200 bg-brand-gray-100 p-1">
        <button
          type="button"
          onClick={() => setTab("manual")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors ${
            tab === "manual"
              ? "bg-white text-brand-charcoal shadow-sm"
              : "text-brand-gray-500 hover:text-brand-charcoal"
          }`}
        >
          <PenLine className="h-4 w-4" />
          Manual Entry
        </button>
        <button
          type="button"
          onClick={() => setTab("pdf")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors ${
            tab === "pdf"
              ? "bg-white text-brand-charcoal shadow-sm"
              : "text-brand-gray-500 hover:text-brand-charcoal"
          }`}
        >
          <Upload className="h-4 w-4" />
          Upload PDF
        </button>
      </div>

      {/* PDF Upload Zone — shown when on PDF tab and not yet extracted */}
      {tab === "pdf" && !pdfExtracted && (
        <PdfDropZone onUpload={handlePdfUpload} parsing={pdfParsing} />
      )}

      {/* PDF extracted banner */}
      {pdfExtracted && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-brand-green bg-brand-green-light px-4 py-3 text-sm font-medium text-brand-green">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          Fields extracted from your PDF. Review and correct anything below before analyzing.
        </div>
      )}

      {/* Show form when: manual tab, OR pdf tab after extraction */}
      {(tab === "manual" || pdfExtracted) && (
        <ContractForm
          form={form}
          updateForm={updateForm}
          onSubmit={handleSubmit}
          loading={loading}
          error={error}
        />
      )}

      {/* Error when on PDF tab without extraction yet */}
      {tab === "pdf" && !pdfExtracted && error && (
        <p className="mt-4 text-center text-sm font-medium text-brand-danger">{error}</p>
      )}
    </main>
  );
}

// =============================================================================
// PDF Drop Zone
// =============================================================================

function PdfDropZone({
  onUpload,
  parsing,
}: {
  onUpload: (file: File) => void;
  parsing: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (file.type !== "application/pdf") return;
      onUpload(file);
    },
    [onUpload]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  if (parsing) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-brand-orange/40 bg-brand-peach-50/50 p-12">
        <Loader2 className="mb-3 h-8 w-8 animate-spin text-brand-orange" />
        <p className="font-medium text-brand-charcoal">Extracting contract details...</p>
        <p className="mt-1 text-sm text-brand-gray-500">
          This usually takes 5-10 seconds
        </p>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => fileRef.current?.click()}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-colors ${
        dragging
          ? "border-brand-orange bg-brand-peach-50/50"
          : "border-brand-gray-300 bg-white hover:border-brand-orange/50 hover:bg-brand-peach-50/30"
      }`}
    >
      <Upload className="mb-3 h-10 w-10 text-brand-gray-400" />
      <p className="font-medium text-brand-charcoal">
        Drop your contract PDF here
      </p>
      <p className="mt-1 text-sm text-brand-gray-500">
        or click to browse &mdash; PDF files up to 10MB
      </p>
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}

// =============================================================================
// Contract Form (shared between manual and post-PDF-extraction)
// =============================================================================

function ContractForm({
  form,
  updateForm,
  onSubmit,
  loading,
  error,
}: {
  form: FormData;
  updateForm: (fields: Partial<FormData>) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  error: string | null;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border border-brand-gray-200 bg-white p-6 shadow-sm"
    >
      {/* Facility & Location */}
      <fieldset className="mb-6">
        <legend className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand-gray-500">
          Facility &amp; Location
        </legend>
        <div className="space-y-4">
          <InputField
            label="Facility name"
            value={form.facility_name}
            onChange={(v) => updateForm({ facility_name: v })}
            placeholder="e.g. Stanford Medical Center"
          />
          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="City"
              value={form.city}
              onChange={(v) => updateForm({ city: v })}
              placeholder="e.g. San Francisco"
              required
            />
            <SelectField
              label="State"
              value={form.state}
              onChange={(v) => updateForm({ state: v })}
              options={STATES.map((s) => ({ value: s.value, label: s.label }))}
              placeholder="Select state"
              required
            />
          </div>
        </div>
      </fieldset>

      {/* Contract Details */}
      <fieldset className="mb-6">
        <legend className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand-gray-500">
          Contract Details
        </legend>
        <div className="grid grid-cols-2 gap-4">
          <SelectField
            label="Specialty"
            value={form.specialty}
            onChange={(v) => updateForm({ specialty: v })}
            options={SPECIALTIES.map((s) => ({ value: s, label: s }))}
            placeholder="Select specialty"
          />
          <SelectField
            label="Shift type"
            value={form.shift_type}
            onChange={(v) => updateForm({ shift_type: v })}
            options={SHIFT_TYPES.map((s) => ({ value: s, label: s }))}
            placeholder="Select shift"
          />
          <InputField
            label="Contract length (weeks)"
            type="number"
            value={form.contract_weeks}
            onChange={(v) => updateForm({ contract_weeks: v })}
            placeholder="13"
          />
          <InputField
            label="Start date"
            type="date"
            value={form.start_date}
            onChange={(v) => updateForm({ start_date: v })}
          />
        </div>
      </fieldset>

      {/* Compensation */}
      <fieldset className="mb-6">
        <legend className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand-gray-500">
          Compensation
        </legend>
        <div className="space-y-4">
          <CurrencyField
            label="Hourly rate"
            value={form.hourly_rate}
            onChange={(v) => updateForm({ hourly_rate: v })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <CurrencyField
              label="Weekly housing stipend"
              value={form.stipend_housing}
              onChange={(v) => updateForm({ stipend_housing: v })}
            />
            <CurrencyField
              label="Weekly meal stipend"
              value={form.stipend_meals}
              onChange={(v) => updateForm({ stipend_meals: v })}
            />
          </div>
          <CurrencyField
            label="Travel reimbursement (one-time)"
            value={form.travel_reimbursement}
            onChange={(v) => updateForm({ travel_reimbursement: v })}
          />
        </div>
      </fieldset>

      {error && (
        <p className="mb-4 text-sm font-medium text-brand-danger">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-orange px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-brand-orange-hover disabled:opacity-60"
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <FileText className="h-5 w-5" />
            Analyze My Offer
          </>
        )}
      </button>
    </form>
  );
}

// =============================================================================
// Results Display
// =============================================================================

function ResultsDisplay({
  result,
  onStartOver,
}: {
  result: AnalysisResult;
  onStartOver: () => void;
}) {
  const isPositive = result.margin_dollars <= 0;
  const absDollars = Math.abs(result.margin_dollars);
  const absPct = Math.abs(result.margin_pct);

  const severityColors = {
    green: { bg: "bg-brand-green-light", text: "text-brand-green", border: "border-brand-green" },
    amber: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-400" },
    red: { bg: "bg-brand-danger-light", text: "text-brand-danger", border: "border-brand-danger" },
  };
  const colors = severityColors[result.margin_severity];

  const facilityLabel = result.facility_name || "this facility";

  return (
    <main className="container max-w-3xl py-10">
      {/* Headline */}
      <div
        className={`mb-8 rounded-xl border-2 ${colors.border} ${colors.bg} p-6 text-center`}
      >
        {isPositive ? (
          <>
            <TrendingUp className={`mx-auto mb-2 h-10 w-10 ${colors.text}`} />
            <h1 className="text-2xl font-bold text-brand-charcoal">
              Your offer looks competitive
            </h1>
            <p className={`mt-1 text-lg font-semibold ${colors.text}`}>
              Your offer is{" "}
              <span className="text-3xl font-extrabold">
                ${formatNum(absDollars)}
              </span>
              /week <span className="font-medium">above</span> GSA market rate
            </p>
          </>
        ) : (
          <>
            <TrendingDown className={`mx-auto mb-2 h-10 w-10 ${colors.text}`} />
            <h1 className="text-2xl font-bold text-brand-charcoal">
              You may be leaving money on the table
            </h1>
            <p className={`mt-1 text-lg font-semibold ${colors.text}`}>
              <span className="text-3xl font-extrabold">
                ${formatNum(absDollars)}/week
              </span>{" "}
              gap &mdash;{" "}
              <span className="text-xl font-bold">
                {absPct.toFixed(1)}% below market
              </span>
            </p>
          </>
        )}
      </div>

      {/* Side-by-Side Comparison */}
      <div className="mb-6 rounded-xl border border-brand-gray-200 bg-white shadow-sm">
        <div className="border-b border-brand-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-brand-charcoal">
            Your Offer vs. The Market
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-gray-200 text-left text-brand-gray-500">
                <th className="px-6 py-3 font-medium"></th>
                <th className="px-6 py-3 font-medium">Your Offer</th>
                <th className="px-6 py-3 font-medium">GSA Market Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-gray-100">
              <tr>
                <td className="px-6 py-3 font-medium text-brand-charcoal">
                  Weekly base (hourly &times; 36)
                </td>
                <td className="px-6 py-3">${formatNum(result.weekly_base)}</td>
                <td className="px-6 py-3 text-brand-gray-400">&mdash;</td>
              </tr>
              <tr>
                <td className="px-6 py-3 font-medium text-brand-charcoal">
                  Housing stipend
                </td>
                <td className="px-6 py-3">${formatNum(result.weekly_housing)}</td>
                <td className="px-6 py-3">
                  ${formatNum(result.gsa_weekly_housing)}
                </td>
              </tr>
              <tr>
                <td className="px-6 py-3 font-medium text-brand-charcoal">
                  Meal stipend
                </td>
                <td className="px-6 py-3">${formatNum(result.weekly_meals)}</td>
                <td className="px-6 py-3">
                  ${formatNum(result.gsa_weekly_meals)}
                </td>
              </tr>
              <tr className="bg-brand-gray-100 font-semibold">
                <td className="px-6 py-3 text-brand-charcoal">
                  Total weekly package
                </td>
                <td className="px-6 py-3">${formatNum(result.total_weekly)}</td>
                <td className="px-6 py-3">
                  ${formatNum(result.gsa_weekly_total)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Bill Rate Estimate */}
      <div className="mb-6 rounded-xl border border-brand-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <DollarSign className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-orange" />
          <div>
            <h3 className="font-semibold text-brand-charcoal">
              Estimated Bill Rate
            </h3>
            <p className="mt-1 text-2xl font-bold text-brand-charcoal">
              ${result.bill_rate_low.toFixed(0)}&ndash;$
              {result.bill_rate_high.toFixed(0)}/hour
            </p>
            <div className="mt-2 flex items-start gap-1.5">
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-gray-400" />
              <p className="text-sm text-brand-gray-500">
                This is what the staffing agency is likely billing the hospital
                for your services. The gap between your pay and the bill rate is
                the agency&rsquo;s margin.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* GSA Source */}
      <p className="mb-8 text-center text-xs text-brand-gray-400">
        Market rates based on GSA FY2025 per diem rates for{" "}
        {result.gsa_city_label}, {result.state}.{" "}
        <a
          href="https://www.gsa.gov/travel/plan-book/per-diem-rates"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-brand-gray-500"
        >
          View GSA rates
        </a>
      </p>

      {/* CTA Banner */}
      <div className="rounded-xl border-2 border-brand-orange/30 bg-gradient-to-br from-brand-peach-50 to-white p-6 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-brand-orange" />
        <h2 className="text-xl font-bold text-brand-charcoal">
          See the negotiation levers for {facilityLabel}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-brand-gray-500">
          Create a free account to access real flex points &mdash; overtime
          rates, callback pay, weekend differentials &mdash; so you negotiate
          from data, not hope.
        </p>
        <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href={`/signup?from=analyze&session_id=${result.session_id}`}
            className="flex items-center gap-2 rounded-lg bg-brand-orange px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-orange-hover"
          >
            Create Free Account
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href={`/login?from=analyze&session_id=${result.session_id}`}
            className="rounded-lg px-6 py-3 text-sm font-medium text-brand-charcoal transition-colors hover:bg-brand-gray-100"
          >
            Sign In
          </Link>
        </div>
      </div>

      {/* Start Over */}
      <div className="mt-6 text-center">
        <button
          onClick={onStartOver}
          className="text-sm text-brand-gray-400 underline hover:text-brand-gray-500"
        >
          Analyze another contract
        </button>
      </div>
    </main>
  );
}

// =============================================================================
// Shared form field components
// =============================================================================

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-brand-charcoal">
        {label}
        {required && <span className="text-brand-danger"> *</span>}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border border-brand-gray-200 bg-white px-3 py-2 text-sm text-brand-charcoal outline-none transition-colors focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
      />
    </label>
  );
}

function CurrencyField({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-brand-charcoal">
        {label}
        {required && <span className="text-brand-danger"> *</span>}
      </span>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-brand-gray-400">
          $
        </span>
        <input
          type="number"
          step="0.01"
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className="w-full rounded-lg border border-brand-gray-200 bg-white py-2 pl-7 pr-3 text-sm text-brand-charcoal outline-none transition-colors focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
        />
      </div>
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-brand-charcoal">
        {label}
        {required && <span className="text-brand-danger"> *</span>}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-lg border border-brand-gray-200 bg-white px-3 py-2 text-sm text-brand-charcoal outline-none transition-colors focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

// =============================================================================
// Helpers
// =============================================================================

function formatNum(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
