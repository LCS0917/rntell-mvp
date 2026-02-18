"use server";

import { createClient } from "@/utils/supabase/server";
import { DEFAULT_HOURLY_RATES, STANDARD_WEEKLY_HOURS, type Specialty } from "@/lib/constants";

export type NurseProfile = {
  specialty: string;
  years_experience: number;
  has_advanced_certs: boolean;
  current_hourly_rate?: number;
  current_stipend_housing?: number;
  current_stipend_meals?: number;
};

export type MarketValueResult = {
  low_range: number;
  fair_market_value: number;
  high_range: number;
  current_weekly_pay: number;
  market_margin_opportunity: number;
  direct_hire_potential: number;
  specialty: string;
  data_points: number;
};

export async function calculateMarketValue(
  nurseProfile: NurseProfile
): Promise<{ data?: MarketValueResult; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Step 1: Fetch avg salary for their specialty from salary_reports
  const { data: reports, error } = await supabase
    .from("salary_reports")
    .select("hourly_rate, stipend_housing, stipend_meals")
    .ilike("specialty", `%${nurseProfile.specialty}%`);

  if (error) return { error: error.message };

  // Calculate base rate from reported data, or use a sensible default
  let baseHourlyRate: number;
  let dataPoints: number;

  if (reports && reports.length > 0) {
    const totalHourly = reports.reduce((sum, r) => sum + r.hourly_rate, 0);
    baseHourlyRate = totalHourly / reports.length;
    dataPoints = reports.length;
  } else {
    baseHourlyRate = DEFAULT_HOURLY_RATES[nurseProfile.specialty as Specialty] ?? 48;
    dataPoints = 0;
  }

  // Step 2: Experience Multiplier — +2% for every year of experience
  const experienceMultiplier = 1 + nurseProfile.years_experience * 0.02;

  // Step 3: Certification Multiplier — +5% if advanced certs
  const certMultiplier = nurseProfile.has_advanced_certs ? 1.05 : 1.0;

  // Calculate fair market hourly rate
  const fairMarketHourly = baseHourlyRate * experienceMultiplier * certMultiplier;

  // Weekly pay = hourly * 36 hrs + average stipends
  const avgStipendHousing = reports && reports.length > 0
    ? reports.reduce((sum, r) => sum + r.stipend_housing, 0) / reports.length
    : 1200;
  const avgStipendMeals = reports && reports.length > 0
    ? reports.reduce((sum, r) => sum + r.stipend_meals, 0) / reports.length
    : 350;
  const avgStipends = avgStipendHousing + avgStipendMeals;

  const fairMarketWeekly = fairMarketHourly * STANDARD_WEEKLY_HOURS + avgStipends;

  // Ranges: low is 90%, high is 115% of fair market value
  const lowRange = Math.round(fairMarketWeekly * 0.9);
  const highRange = Math.round(fairMarketWeekly * 1.15);

  // Current weekly pay (from nurse's input)
  const currentHourly = nurseProfile.current_hourly_rate ?? baseHourlyRate * 0.85;
  const currentHousing = nurseProfile.current_stipend_housing ?? avgStipendHousing * 0.9;
  const currentMeals = nurseProfile.current_stipend_meals ?? avgStipendMeals * 0.9;
  const currentWeeklyPay = currentHourly * STANDARD_WEEKLY_HOURS + currentHousing + currentMeals;

  // Market Margin Opportunity: typical middleman offer is ~8% below market.
  // This is the margin the nurse can capture by going direct-to-facility.
  const marketMarginOpp = Math.round(fairMarketWeekly * 0.92);

  // Direct hire potential is typically ~10% above market
  const directHirePotential = Math.round(fairMarketWeekly * 1.1);

  return {
    data: {
      low_range: lowRange,
      fair_market_value: Math.round(fairMarketWeekly),
      high_range: highRange,
      current_weekly_pay: Math.round(currentWeeklyPay),
      market_margin_opportunity: marketMarginOpp,
      direct_hire_potential: directHirePotential,
      specialty: nurseProfile.specialty,
      data_points: dataPoints,
    },
  };
}
