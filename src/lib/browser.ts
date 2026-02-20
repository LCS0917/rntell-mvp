import { chromium } from 'playwright-core';

export async function getBrowser() {
  const token = process.env.BROWSERLESS_TOKEN; 
  if (!token) throw new Error("BROWSERLESS_TOKEN is missing in Vercel!");

  // This connects to a remote server so Vercel doesn't crash anymore
  return await chromium.connectOverCDP(
    `wss://chrome.browserless.io?token=${token}`
  );
}