import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const CA_BRN_CLIENT_CODE = "8002";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { licenseNumber, state } = await req.json();

  if (!licenseNumber || !state) {
    return NextResponse.json({ error: "License number and state are required" }, { status: 400 });
  }

  try {
    let result;
    if (state === "CA") {
      result = await verifyCA(licenseNumber);
    } else if (state === "WA") {
      result = await verifyWA(licenseNumber);
    } else {
      return NextResponse.json({ error: "State not supported yet" }, { status: 400 });
    }

    if (!result.found) {
      return NextResponse.json({ error: "License not found. Please check the number and try again." }, { status: 404 });
    }

    await supabase.from("nurses").update({
      license_state: state,
      license_verified: result.isActive,
      verification_status: result.isActive ? "verified" : "pending",
    }).eq("id", user.id);

    return NextResponse.json({ success: true, license: result });
  } catch (err) {
    console.error("License verification error:", err);
    return NextResponse.json({ error: "Verification service unavailable. Please try again." }, { status: 500 });
  }
}

async function verifyCA(licenseNumber: string) {
  const username = process.env.DCA_API_USERNAME;
  const password = process.env.DCA_API_PASSWORD;
  const credentials = Buffer.from(`${username}:${password}`).toString("base64");

  const res = await fetch(
    "https://search-api.dca.ca.gov/licenseSearchService/getPublicLicenseSearch",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify({
        clientCode: [CA_BRN_CLIENT_CODE],
        searchMethod: "LIC_NBR",
        licenseNumbers: [licenseNumber],
      }),
    }
  );

  if (!res.ok) throw new Error(`DCA API error: ${res.status}`);

  const data = await res.json();
  const licenses = data?.results || data?.licenseList || [];

  if (!licenses.length) return { found: false };

  const lic = licenses[0];
  const status = lic?.primaryStatus?.toLowerCase() || "";
  const isActive = status.includes("active") || status.includes("clear");

  return {
    found: true,
    isActive,
    name: lic?.licenseeName || lic?.name || "",
    licenseNumber: lic?.licenseNumber || licenseNumber,
    status: lic?.primaryStatus || "Unknown",
    expiryDate: lic?.expirationDate || lic?.expiry || null,
    state: "CA",
    issuingBody: "CA Board of Registered Nursing",
  };
}

async function verifyWA(licenseNumber: string) {
  const res = await fetch(
    `https://data.wa.gov/resource/qxh8-f4bd.json?credential_number=${licenseNumber}&$limit=1`,
    { headers: { "Content-Type": "application/json" } }
  );

  if (!res.ok) throw new Error(`WA API error: ${res.status}`);

  const data = await res.json();
  if (!data.length) return { found: false };

  const lic = data[0];
  const status = lic?.credential_status?.toLowerCase() || "";
  const isActive = status.includes("active");

  return {
    found: true,
    isActive,
    name: `${lic?.first_name || ""} ${lic?.last_name || ""}`.trim(),
    licenseNumber: lic?.credential_number || licenseNumber,
    status: lic?.credential_status || "Unknown",
    expiryDate: lic?.expiration_date || null,
    state: "WA",
    issuingBody: "WA Department of Health",
  };
}
