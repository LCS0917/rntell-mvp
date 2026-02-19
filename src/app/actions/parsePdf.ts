"use server";

import Anthropic from "@anthropic-ai/sdk";
import { PDFParse } from "pdf-parse";

// =============================================================================
// PDF Contract Parser
// Extracts text from uploaded PDF → sends to Claude to pull contract fields
// =============================================================================

export type ExtractedFields = {
  facility_name: string | null;
  city: string | null;
  state: string | null;
  specialty: string | null;
  facility_zip_code: string | null;
  // Layer 1 — Taxable Income
  hourly_rate: number | null;
  overtime_rate: number | null;
  doubletime_rate: number | null;
  oncall_rate: number | null;
  callback_rate: number | null;
  bonus_signon: number | null;
  bonus_completion: number | null;
  bonus_retention: number | null;
  bonus_taxable_week: string | null;
  // Layer 2 — Stipends
  stipend_housing: number | null;
  stipend_meals: number | null;
  travel_reimbursement: number | null;
  reimbursement_type: "reimbursement" | "bonus" | null;
  // Layer 3 — Contract Metadata
  contract_weeks: number | null;
  start_date: string | null; // ISO date string
  contract_end_date: string | null; // ISO date string
  contracted_hours_per_week: number | null;
  // Employment classification (for federal incentive detection)
  employment_type: "W2" | "1099" | null;
  facility_ein: string | null;
};

export type ParsePdfResult = {
  extractedFields: ExtractedFields;
  rawText: string;
};

const EXTRACTION_PROMPT = `Extract the following fields from this travel nursing contract.
Return ONLY a JSON object with these exact keys:

Facility & Location:
- facility_name (string or null)
- city (string or null)
- state (two-letter state code like "CA", "TX", or null)
- specialty (string or null, e.g. "ICU", "ER", "Med-Surg")
- facility_zip_code (string or null — ZIP code of the facility)

Taxable Income:
- hourly_rate (number or null — the base hourly pay rate)
- overtime_rate (number or null — OT hourly rate. If not stated but base rate exists, calculate as base × 1.5)
- doubletime_rate (number or null — DT hourly rate. If not stated but base rate exists, calculate as base × 2)
- oncall_rate (number or null — on-call hourly rate if mentioned)
- callback_rate (number or null — callback hourly rate if mentioned)
- bonus_signon (number or null — sign-on bonus dollar amount)
- bonus_completion (number or null — completion/end-of-contract bonus dollar amount)
- bonus_retention (number or null — retention or extension bonus dollar amount)
- bonus_taxable_week (string or null — which week the bonus is paid, e.g. "first" or "last" or "split")

Stipends & Reimbursements:
- stipend_housing (number or null — weekly housing stipend)
- stipend_meals (number or null — weekly meal/M&IE stipend)
- travel_reimbursement (number or null — one-time travel reimbursement amount)
- reimbursement_type (string or null — "reimbursement" if paid as expense reimbursement, "bonus" if added to paycheck as taxable income)

Contract Terms:
- contract_weeks (number or null — length of contract in weeks)
- start_date (ISO date string like "2025-03-15" or null)
- contract_end_date (ISO date string or null — end date of the contract)
- contracted_hours_per_week (number or null — guaranteed or expected hours per week)

Employment Classification:
- employment_type ("W2" or "1099" or null — the employment classification stated in the contract)
- facility_ein (string or null — the Employer Identification Number / EIN / Tax ID of the facility, formatted as "XX-XXXXXXX" or digits only)

Important notes:
- If a stipend is listed as monthly, divide by 4.33 to get the weekly amount.
- If a stipend is listed as daily, multiply by 7 to get the weekly amount.
- For overtime_rate: if the contract mentions OT but not the rate, calculate as hourly_rate × 1.5.
- For doubletime_rate: if the contract mentions DT but not the rate, calculate as hourly_rate × 2.
- If a field is not found in the document, set it to null.
- Do not include any text outside the JSON object. No explanation, no markdown.`;

export async function parsePdfContract(
  formData: FormData
): Promise<{ data?: ParsePdfResult; error?: string }> {
  try {
    const file = formData.get("file") as File | null;
    if (!file) return { error: "No file provided." };
    if (file.type !== "application/pdf")
      return { error: "Please upload a PDF file." };
    if (file.size > 10 * 1024 * 1024)
      return { error: "File is too large. Maximum size is 10MB." };

    // 1. Extract text from PDF using PDFParse class
    const arrayBuffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    const parser = new PDFParse({ data: uint8, verbosity: 0 });
    const textResult = await parser.getText();
    const rawText = textResult.text;
    await parser.destroy();

    if (!rawText || rawText.trim().length < 50) {
      return {
        error:
          "Could not extract enough text from the PDF. The file may be scanned or image-based. Please use manual entry instead.",
      };
    }

    // 2. Send to Claude for field extraction
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return { error: "AI extraction is not configured. Please use manual entry." };
    }

    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `${EXTRACTION_PROMPT}\n\n--- CONTRACT TEXT ---\n${rawText.slice(0, 15000)}`,
        },
      ],
    });

    // 3. Parse the response
    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    let extractedFields: ExtractedFields;
    try {
      // Strip markdown code fences if present
      const cleaned = responseText.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
      extractedFields = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse Claude response:", responseText);
      return {
        error:
          "Could not parse the contract data. Please review and enter the fields manually.",
      };
    }

    return {
      data: {
        extractedFields,
        rawText,
      },
    };
  } catch (err) {
    console.error("PDF parsing error:", err);
    return { error: "Failed to process the PDF. Please try again or use manual entry." };
  }
}
