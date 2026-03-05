import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
// /scripts/extract-reviews.ts
// Step 3 of the Reddit pipeline:
// Takes all kb_posts tagged category='facility_reviews', uses Gemini to extract
// the facility name, and copies them into the community_reviews table.
// Skips posts already in community_reviews (dedup by kb_post_id).
//
// Usage: npx ts-node -r tsconfig-paths/register scripts/extract-reviews.ts

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const MODEL = 'gemini-2.5-flash-lite';
const BATCH_SIZE = 20;

interface KBPost {
  id: string;
  title: string;
  body: string | null;
  score: number;
  url: string | null;
  subreddit: string | null;
  posted_at: string | null;
}

interface ExtractionResult {
  id: string;
  facility_name: string | null;
}

async function extractFacilityNames(posts: KBPost[]): Promise<ExtractionResult[]> {
  const postList = posts
    .map((p, i) => `Post ${i + 1} (id: ${p.id})\nTitle: ${p.title}\nBody: ${p.body?.slice(0, 500) || '(no body)'}`)
    .join('\n\n---\n\n');

  const prompt = `You are extracting facility/hospital names from Reddit posts about travel nursing.

For each post below, extract the specific hospital or medical facility name being discussed.

Rules:
- Return the FULL facility name (e.g. "Flagstaff Medical Center", not just "Flagstaff")
- If the post mentions a specific unit (e.g. "OR at Flagstaff Medical Center"), return just the facility name
- If no specific facility is named, return null
- If only a city is mentioned without a facility name, return null
- Common abbreviations: "FMC" without context = null, "HCA" alone = null (too generic)

Return a JSON array with one object per post:
[{ "id": "post-uuid", "facility_name": "Hospital Name" | null }]

Posts:

${postList}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0,
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error(`Gemini error: ${res.status} — ${text}`);
    return posts.map((p) => ({ id: p.id, facility_name: null }));
  }

  const data = await res.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';

  try {
    return JSON.parse(raw) as ExtractionResult[];
  } catch {
    console.error('Failed to parse Gemini response:', raw.slice(0, 200));
    return posts.map((p) => ({ id: p.id, facility_name: null }));
  }
}

async function main() {
  console.log('RNTell — Extract Community Reviews (Step 3)');
  console.log('Pulling facility_reviews from kb_posts → community_reviews\n');

  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY not set');
    process.exit(1);
  }

  // Get all facility_reviews posts
  const { data: posts, error } = await supabase
    .from('kb_posts')
    .select('id, title, body, score, url, subreddit, posted_at')
    .eq('category', 'facility_reviews')
    .order('score', { ascending: false });

  if (error || !posts) {
    console.error('Failed to fetch posts:', error?.message);
    process.exit(1);
  }

  console.log(`Found ${posts.length} facility_reviews posts`);

  // Check which are already in community_reviews
  const { data: existing } = await supabase
    .from('community_reviews')
    .select('kb_post_id');

  const existingIds = new Set((existing ?? []).map((r) => r.kb_post_id));
  const newPosts = posts.filter((p) => !existingIds.has(p.id));

  console.log(`Already extracted: ${existingIds.size} | New: ${newPosts.length}\n`);

  if (newPosts.length === 0) {
    console.log('Nothing new to extract. Done.');
    return;
  }

  let inserted = 0;
  let skippedNoName = 0;
  let skippedNoBody = 0;

  // Process in batches
  for (let i = 0; i < newPosts.length; i += BATCH_SIZE) {
    const batch = newPosts.slice(i, i + BATCH_SIZE);
    console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: extracting facility names for ${batch.length} posts...`);

    const results = await extractFacilityNames(batch);

    for (const result of results) {
      if (!result.facility_name) {
        skippedNoName++;
        continue;
      }

      const post = batch.find((p) => p.id === result.id);
      if (!post) continue;

      // Need at least a title or body for the review
      const reviewText = post.body || post.title;
      if (!reviewText || reviewText.length < 10) {
        skippedNoBody++;
        continue;
      }

      const { error: insertError } = await supabase
        .from('community_reviews')
        .insert({
          kb_post_id: post.id,
          facility_name_extracted: result.facility_name,
          review_text: post.body || post.title,
          post_title: post.title,
          score: post.score,
          reddit_url: post.url,
          subreddit: post.subreddit,
          posted_at: post.posted_at,
        });

      if (insertError) {
        if (insertError.message.includes('unique')) {
          // Already exists, skip
        } else {
          console.error(`  Insert error for "${result.facility_name}":`, insertError.message);
        }
        continue;
      }

      inserted++;
    }

    // Rate limit pause between batches
    if (i + BATCH_SIZE < newPosts.length) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  console.log(`\n════════════════════════════════════════`);
  console.log(`Done.`);
  console.log(`  Inserted: ${inserted}`);
  console.log(`  Skipped (no facility name): ${skippedNoName}`);
  console.log(`  Skipped (no review body): ${skippedNoBody}`);
  console.log(`\nNext: use admin panel to match community reviews to facilities.`);
}

main();
