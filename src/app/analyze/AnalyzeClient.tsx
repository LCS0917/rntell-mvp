"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type AnalysisResult,
  type AuditRiskResult,
  type ContractInput,
  type UserTaxContext,
} from "@/app/actions/analyze";
import { parsePdfContract } from "@/app/actions/parsePdf";
import { SPECIALTIES, STATES, SHIFT_TYPES } from "@/lib/constants";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  CheckCircle2,
  ChevronDown,
  DollarSign,
  FileText,
  Info,
  Loader2,
  PenLine,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  Upload,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ContractFormData = {
  // Facility & Location
  facility_name: string;
  city: string;
  state: string;
  specialty: string;
  shift_type: string;
  facility_zip_code: string;
  // Layer 1 — Taxable Income
  hourly_rate: string;
  overtime_rate: string;
  doubletime_rate: string;
  oncall_rate: string;
  callback_rate: string;
  bonus_signon: string;
  bonus_completion: string;
  bonus_retention: string;
  bonus_taxable_week: string;
  // Layer 2 — Stipends
  stipend_housing: string;
  stipend_meals: string;
  travel_reimbursement: string;
  reimbursement_type: string;
  // Layer 3 — Contract Metadata
  contract_weeks: string;
  start_date: string;
  contract_end_date: string;
  contracted_hours_per_week: string;
  // Employment classification
  employment_type: string;
  facility_ein: string;
};

const emptyForm: ContractFormData = {
  facility_name: "",
  city: "",
  state: "",
  specialty: "",
  shift_type: "",
  facility_zip_code: "",
  hourly_rate: "",
  overtime_rate: "",
  doubletime_rate: "",
  oncall_rate: "",
  callback_rate: "",
  bonus_signon: "",
  bonus_completion: "",
  bonus_retention: "",
  bonus_taxable_week: "",
  stipend_housing: "",
  stipend_meals: "",
  travel_reimbursement: "",
  reimbursement_type: "",
  contract_weeks: "13",
  start_date: "",
  contract_end_date: "",
  contracted_hours_per_week: "",
  employment_type: "W2",
  facility_ein: "",
};

type Tab = "manual" | "pdf";

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function AnalyzeClient() {
  const [tab, setTab] = useState<Tab>("manual");
  const [form, setForm] = useState<ContractFormData>(emptyForm);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [auditRisk, setAuditRisk] = useState<AuditRiskResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // PDF-specific state
  const [pdfParsing, setPdfParsing] = useState(false);
  const [pdfExtracted, setPdfExtracted] = useState(false);
  const [rawContractText, setRawContractText] = useState<string | null>(null);

  const updateForm = (fields: Partial<ContractFormData>) =>
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
      facility_zip_code: form.facility_zip_code || undefined,
      // Layer 1
      hourly_rate: parseFloat(form.hourly_rate),
      overtime_rate: form.overtime_rate ? parseFloat(form.overtime_rate) : undefined,
      doubletime_rate: form.doubletime_rate ? parseFloat(form.doubletime_rate) : undefined,
      oncall_rate: form.oncall_rate ? parseFloat(form.oncall_rate) : undefined,
      callback_rate: form.callback_rate ? parseFloat(form.callback_rate) : undefined,
      bonus_signon: form.bonus_signon ? parseFloat(form.bonus_signon) : undefined,
      bonus_completion: form.bonus_completion ? parseFloat(form.bonus_completion) : undefined,
      bonus_retention: form.bonus_retention ? parseFloat(form.bonus_retention) : undefined,
      bonus_taxable_week: form.bonus_taxable_week || undefined,
      // Layer 2
      stipend_housing: form.stipend_housing ? parseFloat(form.stipend_housing) : undefined,
      stipend_meals: form.stipend_meals ? parseFloat(form.stipend_meals) : undefined,
      travel_reimbursement: form.travel_reimbursement
        ? parseFloat(form.travel_reimbursement)
        : undefined,
      reimbursement_type: (form.reimbursement_type as "reimbursement" | "bonus") || undefined,
      // Layer 3
      contract_weeks: form.contract_weeks ? parseInt(form.contract_weeks) : 13,
      start_date: form.start_date || undefined,
      contract_end_date: form.contract_end_date || undefined,
      contracted_hours_per_week: form.contracted_hours_per_week
        ? parseInt(form.contracted_hours_per_week)
        : undefined,
      // Employment classification
      employment_type: (form.employment_type as "W2" | "1099") || "W2",
      facility_ein: form.facility_ein || undefined,
      // Meta
      input_method: pdfExtracted ? "pdf_upload" : "manual",
      raw_contract_text: rawContractText ?? undefined,
    };

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = await res.json();
      if (json.error) {
        setError(json.error);
      } else if (json.data) {
        setResult(json.data);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Something went wrong: ${message}`);
    } finally {
      setLoading(false);
    }
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
        facility_zip_code: f.facility_zip_code ?? "",
        // Layer 1
        hourly_rate: f.hourly_rate != null ? String(f.hourly_rate) : "",
        overtime_rate: f.overtime_rate != null ? String(f.overtime_rate) : "",
        doubletime_rate: f.doubletime_rate != null ? String(f.doubletime_rate) : "",
        oncall_rate: f.oncall_rate != null ? String(f.oncall_rate) : "",
        callback_rate: f.callback_rate != null ? String(f.callback_rate) : "",
        bonus_signon: f.bonus_signon != null ? String(f.bonus_signon) : "",
        bonus_completion: f.bonus_completion != null ? String(f.bonus_completion) : "",
        bonus_retention: f.bonus_retention != null ? String(f.bonus_retention) : "",
        bonus_taxable_week: f.bonus_taxable_week ?? "",
        // Layer 2
        stipend_housing: f.stipend_housing != null ? String(f.stipend_housing) : "",
        stipend_meals: f.stipend_meals != null ? String(f.stipend_meals) : "",
        travel_reimbursement:
          f.travel_reimbursement != null ? String(f.travel_reimbursement) : "",
        reimbursement_type: f.reimbursement_type ?? "",
        // Layer 3
        contract_weeks: f.contract_weeks != null ? String(f.contract_weeks) : "13",
        start_date: f.start_date ?? "",
        contract_end_date: f.contract_end_date ?? "",
        contracted_hours_per_week:
          f.contracted_hours_per_week != null ? String(f.contracted_hours_per_week) : "",
        employment_type: f.employment_type ?? "W2",
        facility_ein: f.facility_ein ?? "",
      });
      setPdfExtracted(true);
    }

    setPdfParsing(false);
  };

  const handleAuditRiskSaved = (risk: AuditRiskResult) => {
    setAuditRisk(risk);
  };

  // Scroll to top when results appear
  useEffect(() => {
    if (result) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [result]);

  // Show results
  if (result) {
    return (
      <ResultsDisplay
        result={result}
        auditRisk={auditRisk}
        onAuditRiskSaved={handleAuditRiskSaved}
        onStartOver={() => {
          setResult(null);
          setAuditRisk(null);
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
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
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
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
            tab === "pdf"
              ? "bg-white text-brand-charcoal shadow-sm"
              : "text-brand-gray-500 hover:text-brand-charcoal"
          }`}
        >
          <Upload className="h-4 w-4" />
          Upload PDF
        </button>
      </div>

      {/* PDF Upload Zone */}
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
        <p className="mt-1 text-sm text-brand-gray-500">This usually takes 5–10 seconds</p>
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
      className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-all duration-200 ${
        dragging
          ? "border-brand-orange bg-brand-peach-50/50 scale-[1.01]"
          : "border-brand-gray-300 bg-white hover:border-brand-orange/50 hover:bg-brand-peach-50/30"
      }`}
    >
      <Upload className="mb-3 h-10 w-10 text-brand-gray-400" />
      <p className="font-medium text-brand-charcoal">Drop your contract PDF here</p>
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
  form: ContractFormData;
  updateForm: (fields: Partial<ContractFormData>) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  error: string | null;
}) {
  const [showDifferentials, setShowDifferentials] = useState(false);
  const [showBonuses, setShowBonuses] = useState(false);

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
          <InputField
            label="Facility ZIP code"
            value={form.facility_zip_code}
            onChange={(v) => updateForm({ facility_zip_code: v })}
            placeholder="e.g. 94102"
          />
        </div>
      </fieldset>

      {/* Contract Details */}
      <fieldset className="mb-6 border-t border-brand-gray-100 pt-6">
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
            label="Hours per week"
            type="number"
            value={form.contracted_hours_per_week}
            onChange={(v) => updateForm({ contracted_hours_per_week: v })}
            placeholder="36"
          />
          <InputField
            label="Start date"
            type="date"
            value={form.start_date}
            onChange={(v) => updateForm({ start_date: v })}
          />
          <InputField
            label="End date"
            type="date"
            value={form.contract_end_date}
            onChange={(v) => updateForm({ contract_end_date: v })}
          />
          <SelectField
            label="Employment type"
            value={form.employment_type}
            onChange={(v) => updateForm({ employment_type: v })}
            options={[
              { value: "W2", label: "W-2 Employee" },
              { value: "1099", label: "1099 Independent Contractor" },
            ]}
            placeholder="Select type"
          />
          <InputField
            label="Facility EIN (optional)"
            value={form.facility_ein}
            onChange={(v) => updateForm({ facility_ein: v })}
            placeholder="e.g. 94-1156621"
          />
        </div>
      </fieldset>

      {/* Compensation */}
      <fieldset className="mb-6 border-t border-brand-gray-100 pt-6">
        <legend className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand-gray-500">
          Compensation
        </legend>
        <div className="space-y-4">
          <CurrencyField
            label="Base hourly rate"
            value={form.hourly_rate}
            onChange={(v) => updateForm({ hourly_rate: v })}
            required
          />

          {/* OT / DT / Differentials — collapsible */}
          <button
            type="button"
            onClick={() => setShowDifferentials((p) => !p)}
            className="flex w-full items-center justify-between rounded-lg border border-brand-gray-200 bg-brand-gray-50 px-4 py-2.5 text-sm font-medium text-brand-charcoal hover:bg-brand-gray-100"
          >
            <span>Overtime, On-Call &amp; Differential Rates</span>
            <ChevronDown
              className={`h-4 w-4 text-brand-gray-400 transition-transform duration-200 ${showDifferentials ? "rotate-180" : ""}`}
            />
          </button>
          <div
            className="grid transition-[grid-template-rows] duration-200 ease-out"
            style={{ gridTemplateRows: showDifferentials ? "1fr" : "0fr" }}
          >
            <div className="overflow-hidden">
              <div className="mt-3 grid grid-cols-2 gap-4 rounded-lg border border-brand-gray-200 bg-brand-gray-50 p-4">
                <CurrencyField
                  label="Overtime rate (1.5x)"
                  value={form.overtime_rate}
                  onChange={(v) => updateForm({ overtime_rate: v })}
                  placeholder="Auto-calculated if blank"
                />
                <CurrencyField
                  label="Double-time rate (2x)"
                  value={form.doubletime_rate}
                  onChange={(v) => updateForm({ doubletime_rate: v })}
                  placeholder="Auto-calculated if blank"
                />
                <CurrencyField
                  label="On-call rate"
                  value={form.oncall_rate}
                  onChange={(v) => updateForm({ oncall_rate: v })}
                />
                <CurrencyField
                  label="Callback rate"
                  value={form.callback_rate}
                  onChange={(v) => updateForm({ callback_rate: v })}
                />
              </div>
            </div>
          </div>
        </div>
      </fieldset>

      {/* Stipends */}
      <fieldset className="mb-6 border-t border-brand-gray-100 pt-6">
        <legend className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand-gray-500">
          Stipends &amp; Reimbursements
        </legend>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <CurrencyField
              label="Weekly housing stipend"
              value={form.stipend_housing}
              onChange={(v) => updateForm({ stipend_housing: v })}
            />
            <CurrencyField
              label="Weekly meal stipend (M&amp;IE)"
              value={form.stipend_meals}
              onChange={(v) => updateForm({ stipend_meals: v })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <CurrencyField
              label="Travel reimbursement (one-time)"
              value={form.travel_reimbursement}
              onChange={(v) => updateForm({ travel_reimbursement: v })}
            />
            <SelectField
              label="Reimbursement paid as"
              value={form.reimbursement_type}
              onChange={(v) => updateForm({ reimbursement_type: v })}
              options={[
                { value: "reimbursement", label: "Expense reimbursement (non-taxable)" },
                { value: "bonus", label: "Bonus / added to paycheck (taxable)" },
              ]}
              placeholder="Select type"
            />
          </div>
        </div>
      </fieldset>

      {/* Bonuses — collapsible */}
      <fieldset className="mb-6 border-t border-brand-gray-100 pt-6">
        <button
          type="button"
          onClick={() => setShowBonuses((p) => !p)}
          className="flex w-full items-center justify-between rounded-lg border border-brand-gray-200 bg-brand-gray-50 px-4 py-2.5 text-sm font-medium text-brand-charcoal hover:bg-brand-gray-100"
        >
          <span>Bonuses (optional)</span>
          <ChevronDown
            className={`h-4 w-4 text-brand-gray-400 transition-transform duration-200 ${showBonuses ? "rotate-180" : ""}`}
          />
        </button>
        <div
          className="grid transition-[grid-template-rows] duration-200 ease-out"
          style={{ gridTemplateRows: showBonuses ? "1fr" : "0fr" }}
        >
          <div className="overflow-hidden">
            <div className="mt-3 space-y-4 rounded-lg border border-brand-gray-200 bg-brand-gray-50 p-4">
              <div className="grid grid-cols-2 gap-4">
                <CurrencyField
                  label="Sign-on bonus"
                  value={form.bonus_signon}
                  onChange={(v) => updateForm({ bonus_signon: v })}
                />
                <CurrencyField
                  label="Completion bonus"
                  value={form.bonus_completion}
                  onChange={(v) => updateForm({ bonus_completion: v })}
                />
                <CurrencyField
                  label="Retention bonus"
                  value={form.bonus_retention}
                  onChange={(v) => updateForm({ bonus_retention: v })}
                />
                <InputField
                  label="Bonus paid in which week?"
                  value={form.bonus_taxable_week}
                  onChange={(v) => updateForm({ bonus_taxable_week: v })}
                  placeholder='e.g. "first" or "last"'
                />
              </div>
            </div>
          </div>
        </div>
      </fieldset>

      {error && (
        <p className="mb-4 text-sm font-medium text-brand-danger">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-orange px-6 py-3 text-base font-semibold text-white transition-all duration-150 hover:bg-brand-orange-hover active:scale-[0.98] disabled:opacity-60"
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
  auditRisk,
  onAuditRiskSaved,
  onStartOver,
}: {
  result: AnalysisResult;
  auditRisk: AuditRiskResult | null;
  onAuditRiskSaved: (risk: AuditRiskResult) => void;
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
    <main className="container max-w-3xl py-10 space-y-6">
      {/* Headline */}
      <div className={`rounded-xl border-2 ${colors.border} ${colors.bg} p-6 text-center`}>
        {isPositive ? (
          <>
            <TrendingUp className={`mx-auto mb-2 h-10 w-10 ${colors.text}`} />
            <h1 className="text-2xl font-bold text-brand-charcoal">Your offer looks competitive</h1>
            <p className={`mt-1 text-lg font-semibold ${colors.text}`}>
              Your offer is{" "}
              <span className="text-3xl font-extrabold">${formatNum(absDollars)}</span>
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
              <span className="text-3xl font-extrabold">${formatNum(absDollars)}/week</span> gap
              &mdash;{" "}
              <span className="text-xl font-bold">{absPct.toFixed(1)}% below market</span>
            </p>
          </>
        )}
      </div>

      {/* Wage Recharacterization Alert */}
      {result.wage_recharacterization_risk && (
        <div className="flex gap-3 rounded-xl border-2 border-amber-400 bg-amber-50 p-5">
          <ShieldAlert className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold text-amber-800">Wage Recharacterization Risk</p>
            <p className="mt-1 text-sm text-amber-700">
              Your base hourly rate (${result.hourly_rate}/hr) is below $25/hr. The IRS may
              reclassify a larger share of your total compensation as taxable wages, reducing the
              tax advantage of non-taxable stipends. This is a common audit trigger for travel
              nurses.
            </p>
          </div>
        </div>
      )}

      {/* Reimbursement taxability alert */}
      {result.reimbursement_taxable && result.travel_reimbursement != null && (
        <div className="flex gap-3 rounded-xl border-2 border-amber-400 bg-amber-50 p-5">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold text-amber-800">Travel Reimbursement is Taxable</p>
            <p className="mt-1 text-sm text-amber-700">
              Your travel reimbursement of ${formatNum(result.travel_reimbursement)} is classified
              as a bonus, not an expense reimbursement — meaning it is fully taxable income.
            </p>
          </div>
        </div>
      )}

      {/* Hours flag */}
      {result.hours_flag && (
        <div className="flex gap-3 rounded-xl border border-brand-gray-200 bg-white p-4">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-gray-400" />
          <p className="text-sm text-brand-gray-500">{result.hours_flag}</p>
        </div>
      )}

      {/* Section 1: Taxable Income */}
      <ResultsSection title="Taxable Income">
        <TwoColRow label="Base hourly rate" value={`$${result.hourly_rate}/hr`} />
        <TwoColRow label="Overtime rate (1.5x)" value={`$${result.overtime_rate ?? "—"}/hr`} />
        <TwoColRow label="Double-time rate (2x)" value={`$${result.doubletime_rate ?? "—"}/hr`} />
        {result.oncall_rate != null && (
          <TwoColRow label="On-call rate" value={`$${result.oncall_rate}/hr`} />
        )}
        {result.callback_rate != null && (
          <TwoColRow label="Callback rate" value={`$${result.callback_rate}/hr`} />
        )}
        <TwoColRow
          label={`Weekly base (${result.contracted_hours_per_week ?? 36} hrs)`}
          value={`$${formatNum(result.weekly_base)}`}
          highlight
        />
        {(result.bonus_signon != null || result.bonus_completion != null || result.bonus_retention != null) && (
          <>
            <div className="col-span-2 pt-2 text-xs font-semibold uppercase tracking-wide text-brand-gray-400">
              Bonuses
            </div>
            {result.bonus_signon != null && (
              <TwoColRow label="Sign-on bonus" value={`$${formatNum(result.bonus_signon)}`} />
            )}
            {result.bonus_completion != null && (
              <TwoColRow
                label="Completion bonus"
                value={`$${formatNum(result.bonus_completion)}`}
              />
            )}
            {result.bonus_retention != null && (
              <TwoColRow
                label="Retention bonus"
                value={`$${formatNum(result.bonus_retention)}`}
              />
            )}
            {result.bonus_taxable_week && (
              <TwoColRow label="Bonus paid" value={`Week ${result.bonus_taxable_week}`} />
            )}
          </>
        )}
      </ResultsSection>

      {/* Section 2: Stipends */}
      <ResultsSection title="Stipends">
        <div className="col-span-2 grid grid-cols-3 gap-2 pb-1 text-xs font-semibold uppercase tracking-wide text-brand-gray-400">
          <span>Item</span>
          <span>Your Offer</span>
          <span>GSA Max</span>
        </div>
        <StipendRow
          label="Housing (weekly)"
          offer={result.weekly_housing}
          gsa={result.gsa_weekly_housing}
        />
        <StipendRow
          label="Meals / M&IE (weekly)"
          offer={result.weekly_meals}
          gsa={result.gsa_weekly_meals}
        />
        <div className="col-span-2 mt-1 border-t border-brand-gray-100 pt-2">
          <div className="grid grid-cols-3 gap-2">
            <span className="text-sm font-semibold text-brand-charcoal">Total stipends</span>
            <span className="text-sm font-semibold text-brand-charcoal">
              ${formatNum(result.weekly_housing + result.weekly_meals)}/wk
            </span>
            <span className="text-sm font-semibold text-brand-charcoal">
              ${formatNum(result.gsa_weekly_total)}/wk
            </span>
          </div>
        </div>
        {result.travel_reimbursement != null && (
          <TwoColRow
            label={`Travel reimbursement${result.reimbursement_taxable ? " (taxable)" : ""}`}
            value={`$${formatNum(result.travel_reimbursement)} one-time`}
          />
        )}
        {/* Optimization gap callout */}
        {(result.stipend_optimization_gap.housing_gap > 0 ||
          result.stipend_optimization_gap.meals_gap > 0) && (
          <div className="col-span-2 mt-2 rounded-lg border border-brand-gray-200 bg-brand-gray-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-gray-500">
              Stipend Optimization Gap
            </p>
            <p className="mt-1 text-sm text-brand-gray-600">
              You could potentially negotiate{" "}
              {result.stipend_optimization_gap.housing_gap > 0 &&
                `+$${formatNum(result.stipend_optimization_gap.housing_gap)}/wk in housing`}
              {result.stipend_optimization_gap.housing_gap > 0 &&
                result.stipend_optimization_gap.meals_gap > 0 &&
                " and "}
              {result.stipend_optimization_gap.meals_gap > 0 &&
                `+$${formatNum(result.stipend_optimization_gap.meals_gap)}/wk in meals`}{" "}
              before exceeding GSA limits.
            </p>
          </div>
        )}
      </ResultsSection>

      {/* Section 3: Contract Terms */}
      <ResultsSection title="Contract Terms">
        {result.facility_zip_code && (
          <TwoColRow label="Facility ZIP" value={result.facility_zip_code} />
        )}
        <TwoColRow label="Location" value={`${result.city}, ${result.state}`} />
        {result.specialty && <TwoColRow label="Specialty" value={result.specialty} />}
        <TwoColRow label="Length" value={`${result.contract_weeks} weeks`} />
        {result.contracted_hours_per_week && (
          <TwoColRow label="Hours / week" value={`${result.contracted_hours_per_week}`} />
        )}
        {result.contract_end_date && (
          <TwoColRow label="End date" value={formatDate(result.contract_end_date)} />
        )}
        <TwoColRow
          label="Total weekly package"
          value={`$${formatNum(result.total_weekly)}`}
          highlight
        />
      </ResultsSection>

      {/* Bill Rate Estimate */}
      <div className="rounded-xl border border-brand-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <DollarSign className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-orange" />
          <div>
            <h3 className="font-semibold text-brand-charcoal">Estimated Bill Rate</h3>
            <p className="mt-1 text-2xl font-bold text-brand-charcoal">
              ${result.bill_rate_low.toFixed(0)}&ndash;${result.bill_rate_high.toFixed(0)}/hour
            </p>
            <div className="mt-2 flex items-start gap-1.5">
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-gray-400" />
              <p className="text-sm text-brand-gray-500">
                What the facility is likely paying for your services. The gap between your pay and
                the bill rate represents the staffing margin.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Federal Incentive Layer */}
      {result.federal_incentive_layer && (
        <FederalIncentiveCard layer={result.federal_incentive_layer} />
      )}

      {/* GSA Source */}
      <p className="text-center text-xs text-brand-gray-400">
        Market rates based on GSA FY2025 per diem rates for {result.gsa_city_label},{" "}
        {result.state}.{" "}
        <a
          href="https://www.gsa.gov/travel/plan-book/per-diem-rates"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-brand-gray-500"
        >
          View GSA rates
        </a>
      </p>

      {/* Tax Context Form / Audit Risk Score */}
      {auditRisk ? (
        <AuditRiskScore risk={auditRisk} />
      ) : (
        <TaxContextForm
          result={result}
          onSaved={onAuditRiskSaved}
        />
      )}

      {/* CTA Banner */}
      <div className="rounded-xl border-2 border-brand-orange/30 bg-gradient-to-br from-brand-peach-50 to-white p-6 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-brand-orange" />
        <h2 className="text-xl font-bold text-brand-charcoal">
          See the negotiation levers for {facilityLabel}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-brand-gray-500">
          Create a free account to access real flex points — overtime rates, callback pay, weekend
          differentials — so you negotiate from data, not hope.
        </p>
        <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href={`/signup?from=analyze&session_id=${result.session_id}`}
            className="flex items-center gap-2 rounded-lg bg-brand-orange px-6 py-3 text-sm font-semibold text-white transition-all duration-150 hover:bg-brand-orange-hover active:scale-[0.98]"
          >
            Create Free Account
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href={`/login?from=analyze&session_id=${result.session_id}`}
            className="rounded-lg px-6 py-3 text-sm font-medium text-brand-charcoal transition-all duration-150 hover:bg-brand-gray-100"
          >
            Sign In
          </Link>
        </div>
      </div>

      {/* Start Over */}
      <div className="text-center">
        <button
          onClick={onStartOver}
          className="text-sm font-medium text-brand-gray-500 transition-colors hover:text-brand-charcoal"
        >
          &larr; Analyze another contract
        </button>
      </div>
    </main>
  );
}

// =============================================================================
// Federal Incentive Card
// =============================================================================

function FederalIncentiveCard({
  layer,
}: {
  layer: NonNullable<AnalysisResult["federal_incentive_layer"]>;
}) {
  const hasOpportunity = layer.federal_opportunity_flag;
  const score = layer.federal_strength_score;

  const scoreColor =
    score >= 70 ? "text-brand-green" : score >= 50 ? "text-teal-600" : "text-brand-gray-500";
  const barColor =
    score >= 70 ? "bg-brand-green" : score >= 50 ? "bg-teal-500" : "bg-brand-gray-300";

  return (
    <div
      className={`rounded-xl border-2 ${
        hasOpportunity ? "border-teal-300 bg-teal-50/50" : "border-brand-gray-200 bg-white"
      } shadow-sm`}
    >
      <div className="flex items-center gap-3 border-b border-brand-gray-100 px-6 py-4">
        <Award className={`h-5 w-5 ${hasOpportunity ? "text-teal-600" : "text-brand-gray-400"}`} />
        <h3 className="font-semibold text-brand-charcoal">Federal Incentive Eligibility</h3>
        {hasOpportunity && (
          <span className="ml-auto rounded-full bg-teal-100 px-3 py-0.5 text-xs font-semibold text-teal-700">
            Opportunity Detected
          </span>
        )}
      </div>

      <div className="space-y-4 px-6 py-4">
        {/* Federal Strength Score */}
        <div>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-brand-gray-500">Federal Strength Score</span>
            <span className={`font-bold ${scoreColor}`}>{score}/100</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-brand-gray-100">
            <div
              className={`h-full rounded-full transition-all ${barColor}`}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>

        {/* PSLF */}
        <div className="rounded-lg border border-brand-gray-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-brand-charcoal">
              PSLF (Public Service Loan Forgiveness)
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                layer.pslf.eligible
                  ? "bg-brand-green-light text-brand-green"
                  : "bg-brand-gray-100 text-brand-gray-500"
              }`}
            >
              {layer.pslf.eligible ? "Potentially Eligible" : "Not Eligible"}
            </span>
          </div>
          <p className="text-xs text-brand-gray-500">{layer.pslf.notes}</p>
          {layer.pslf.confidence_score > 0 && (
            <p className="mt-1 text-xs text-brand-gray-400">
              Confidence: {Math.round(layer.pslf.confidence_score * 100)}%
            </p>
          )}
        </div>

        {/* HRSA / HPSA */}
        <div className="rounded-lg border border-brand-gray-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-brand-charcoal">
              HRSA Loan Repayment (HPSA)
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                layer.hrsa.potentially_eligible
                  ? "bg-brand-green-light text-brand-green"
                  : "bg-brand-gray-100 text-brand-gray-500"
              }`}
            >
              {layer.hrsa.potentially_eligible ? "Potentially Eligible" : "Not Eligible"}
            </span>
          </div>
          <p className="text-xs text-brand-gray-500">{layer.hrsa.notes}</p>
          {layer.hrsa.hpsa_type && (
            <p className="mt-1 text-xs text-brand-gray-400">
              HPSA Type: {layer.hrsa.hpsa_type.replace("_", " ")}
            </p>
          )}
        </div>

        {/* Disclaimer */}
        <div className="flex gap-2 rounded-lg bg-brand-gray-50 p-3">
          <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-brand-gray-400" />
          <p className="text-xs text-brand-gray-400">
            Eligibility detection is based on public data and name matching. Verify with the
            facility&apos;s HR department and consult{" "}
            <a
              href="https://studentaid.gov/manage-loans/forgiveness-cancellation/public-service"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              StudentAid.gov
            </a>{" "}
            or{" "}
            <a
              href="https://nhsc.hrsa.gov/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              HRSA NHSC
            </a>{" "}
            for official eligibility requirements.
          </p>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Tax Context Form (Layer 4)
// =============================================================================

function TaxContextForm({
  result,
  onSaved,
}: {
  result: AnalysisResult;
  onSaved: (risk: AuditRiskResult) => void;
}) {
  const [open, setOpen] = useState(false);
  const [taxHomeZip, setTaxHomeZip] = useState("");
  const [monthlyExpense, setMonthlyExpense] = useState("");
  const [metroMonths, setMetroMonths] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expenseNum = monthlyExpense !== "" ? parseFloat(monthlyExpense) : null;
  const metroNum = metroMonths !== "" ? parseInt(metroMonths) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taxHomeZip || expenseNum === null || metroNum === null) {
      setError("All three fields are required.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const ctx: UserTaxContext = {
        tax_home_zip: taxHomeZip,
        tax_home_monthly_expense: expenseNum,
        metro_months_last_24: metroNum,
      };
      const response = await fetch("/api/analyze/audit-risk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysis_id: result.id,
          session_id: result.session_id,
          tax_context: ctx,
          hourly_rate: result.hourly_rate,
          stipend_housing: result.weekly_housing,
          stipend_meals: result.weekly_meals,
          gsa_weekly_housing: result.gsa_weekly_housing,
          gsa_weekly_meals: result.gsa_weekly_meals,
        }),
      });
      const res = await response.json();
      if (res.error) {
        setError(res.error);
      } else if (res.data) {
        onSaved(res.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-brand-gray-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center justify-between px-6 py-4 text-left"
      >
        <div>
          <p className="font-semibold text-brand-charcoal">Calculate Your Audit Risk Score</p>
          <p className="mt-0.5 text-sm text-brand-gray-500">
            3 quick questions to assess IRS audit exposure — optional but recommended
          </p>
        </div>
        <ChevronDown
          className={`h-5 w-5 flex-shrink-0 text-brand-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="border-t border-brand-gray-200 px-6 pb-6 pt-4">
          <div className="mb-5 rounded-lg border border-brand-gray-200 bg-brand-gray-50 p-3">
            <p className="text-xs text-brand-gray-500">
              This data is used only to calculate your local audit risk score. It is not shared or
              sold.
            </p>
          </div>

          <div className="space-y-5">
            {/* Tax home ZIP */}
            <div>
              <InputField
                label="Permanent tax home ZIP code"
                value={taxHomeZip}
                onChange={setTaxHomeZip}
                placeholder="e.g. 78701"
              />
              <p className="mt-1 text-xs text-brand-gray-400">
                Your permanent home address — used to calculate distance to this assignment.
              </p>
            </div>

            {/* Monthly tax home expense */}
            <div>
              <CurrencyField
                label="Monthly housing expense at tax home (rent or mortgage)"
                value={monthlyExpense}
                onChange={setMonthlyExpense}
              />
              <p className="mt-1 text-xs text-brand-gray-400">
                Mortgage payment or rent at your permanent home each month.
              </p>
              {expenseNum === 0 && (
                <div className="mt-2 flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
                  <p className="text-xs text-amber-700">
                    If you pay no housing costs at your tax home, the IRS may classify all travel
                    stipends as taxable income. This significantly changes your tax exposure.
                  </p>
                </div>
              )}
            </div>

            {/* Metro months */}
            <div>
              <InputField
                label="Months worked in this metro area (last 24 months)"
                type="number"
                value={metroMonths}
                onChange={setMetroMonths}
                placeholder="e.g. 6"
              />
              <p className="mt-1 text-xs text-brand-gray-400">
                How many months have you worked in this specific metro area in the last 24 months?
              </p>
              {metroNum !== null && metroNum >= 10 && (
                <div className="mt-2 flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
                  <p className="text-xs text-amber-700">
                    You may be approaching the 12-month rule. Exceeding this threshold can
                    invalidate your tax-free stipend status for this assignment.
                  </p>
                </div>
              )}
            </div>
          </div>

          {error && (
            <p className="mt-4 text-sm font-medium text-brand-danger">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-orange px-6 py-3 text-base font-semibold text-white transition-all duration-150 hover:bg-brand-orange-hover active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Calculating...
              </>
            ) : (
              "Calculate Audit Risk Score"
            )}
          </button>
        </form>
      )}
    </div>
  );
}

// =============================================================================
// Audit Risk Score display
// =============================================================================

function AuditRiskScore({ risk }: { risk: AuditRiskResult }) {
  const score = risk.audit_risk_score;
  const scoreColor =
    score >= 60 ? "text-brand-danger" : score >= 30 ? "text-amber-600" : "text-brand-green";
  const barColor =
    score >= 60 ? "bg-brand-danger" : score >= 30 ? "bg-amber-400" : "bg-brand-green";
  const label = score >= 60 ? "High Risk" : score >= 30 ? "Moderate Risk" : "Low Risk";

  return (
    <div className="rounded-xl border border-brand-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-brand-charcoal">Audit Risk Score</h3>
        <span className={`text-3xl font-extrabold ${scoreColor}`}>{score}/100</span>
      </div>

      {/* Score bar */}
      <div className="mb-1 h-3 w-full overflow-hidden rounded-full bg-brand-gray-100">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <p className={`mb-5 text-right text-sm font-semibold ${scoreColor}`}>{label}</p>

      {/* Score breakdown */}
      <div className="mb-5 space-y-2">
        {risk.score_breakdown.base_rate_risk > 0 && (
          <ScoreRow label="Base rate below $25/hr" points={risk.score_breakdown.base_rate_risk} />
        )}
        {risk.score_breakdown.tax_home_risk > 0 && (
          <ScoreRow
            label="No tax home housing expense"
            points={risk.score_breakdown.tax_home_risk}
          />
        )}
        {risk.score_breakdown.stipend_excess_risk > 0 && (
          <ScoreRow
            label="Stipend exceeds GSA maximum"
            points={risk.score_breakdown.stipend_excess_risk}
          />
        )}
        {risk.score_breakdown.metro_time_risk > 0 && (
          <ScoreRow
            label="Metro time approaching 12-month limit"
            points={risk.score_breakdown.metro_time_risk}
          />
        )}
        {score === 0 && (
          <p className="text-sm text-brand-gray-500">
            No significant risk factors detected based on the information provided.
          </p>
        )}
      </div>

      {/* Alerts */}
      {risk.alerts.length > 0 && (
        <div className="space-y-3">
          {risk.alerts.map((alert, i) => (
            <div
              key={i}
              className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
              <p className="text-xs text-amber-700">{alert}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ScoreRow({ label, points }: { label: string; points: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-brand-gray-600">{label}</span>
      <span className="font-semibold text-brand-danger">+{points} pts</span>
    </div>
  );
}

// =============================================================================
// Results Section wrapper
// =============================================================================

function ResultsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-brand-gray-200 bg-white shadow-sm">
      <div className="border-b border-brand-gray-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-brand-charcoal">{title}</h2>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 px-6 py-4">{children}</div>
    </div>
  );
}

function TwoColRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <>
      <span
        className={`text-sm ${highlight ? "font-semibold text-brand-charcoal" : "text-brand-gray-500"}`}
      >
        {label}
      </span>
      <span
        className={`text-sm ${highlight ? "font-semibold text-brand-charcoal" : "text-brand-charcoal"}`}
      >
        {value}
      </span>
    </>
  );
}

function StipendRow({
  label,
  offer,
  gsa,
}: {
  label: string;
  offer: number;
  gsa: number;
}) {
  const overGsa = offer > gsa;
  const atGsa = offer === gsa;
  const dotColor = overGsa
    ? "bg-brand-danger"
    : atGsa
      ? "bg-amber-400"
      : offer > 0
        ? "bg-brand-green"
        : null;

  return (
    <div className="col-span-2 grid grid-cols-3 items-center gap-2">
      <span className="text-sm text-brand-gray-500">{label}</span>
      <span className="flex items-center gap-1.5 text-sm font-medium text-brand-charcoal">
        {offer > 0 ? `$${formatNum(offer)}/wk` : "—"}
        {dotColor && <span className={`inline-block h-2 w-2 rounded-full ${dotColor}`} />}
      </span>
      <span className="text-sm text-brand-gray-500">${formatNum(gsa)}/wk</span>
    </div>
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
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
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
          placeholder={placeholder}
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

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
