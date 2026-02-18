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
  hourly_rate: number | null;
  stipend_housing: number | null;
  stipend_meals: number | null;
  travel_reimbursement: number | null;
  contract_weeks: number | null;
  start_date: string | null; // ISO date string
};

export type ParsePdfResult = {
  extractedFields: ExtractedFields;
  rawText: string;
};

const EXTRACTION_PROMPT = `Extract the following fields from this travel nursing contract.
Return ONLY a JSON object with these exact keys:
- facility_name (string or null)
- city (string or null)
- state (two-letter state code like "CA", "TX", or null)
- specialty (string or null, e.g. "ICU", "ER", "Med-Surg")
- hourly_rate (number or null — the base hourly pay rate)
- stipend_housing (number or null — weekly housing stipend)
- stipend_meals (number or null — weekly meal/M&IE stipend)
- travel_reimbursement (number or null — one-time travel reimbursement)
- contract_weeks (number or null — length of contract in weeks)
- start_date (ISO date string like "2025-03-15" or null)

Important notes:
- If a stipend is listed as monthly, divide by 4.33 to get the weekly amount.
- If a stipend is listed as daily, multiply by 7 to get the weekly amount.
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
