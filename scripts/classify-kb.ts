import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
// /scripts/classify-kb.ts
// Reads kb_posts where category IS NULL and classifies them in batches of 25
// using a single Gemini API call per batch. No posts are ever discarded —
// posts that don't fit the 7 categories get category = 'uncategorized'.
// Usage: npx ts-node -r tsconfig-paths/register scripts/classify-kb.ts
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const MODEL = 'gemini-2.5-flash-lite';
const BATCH_SIZE = 25;
const VALID_CATEGORIES = [
  'pay_and_contracts',
  'agency_vs_direct_hire',
  'housing_and_stipends',
  'taxes_and_insurance',
  'licensing_and_compliance',
  'facility_reviews',
  'getting_started',
  'uncategorized',
];

const CATEGORY_DESCRIPTIONS = `
- pay_and_contracts: hourly rates, total packages, contract terms, OT, differentials
- agency_vs_direct_hire: recruiter experience, agency comparisons, going direct
- housing_and_stipends: housing stipends, finding housing, per diem, GSA rates
- taxes_and_insurance: tax homes, dual state taxes, per diem rules, health insurance
- licensing_and_compliance: compact license, state licensing, certifications, compliance
- facility_reviews: specific hospitals, unit culture, staffing ratios, management
- getting_started: first travel contract, how to start, what to expect
- uncategorized: anything that doesn't fit the above (memes, photos, off-topic)
`;

interface KBPost {
  id: string;
  title: string;
  body: string | null;
}

interface PostClassification {
  id: string;
  category: string;
  topics: string[];
}

async function classifyBatch(posts: KBPost[]): Promise<PostClassification[]> {
  const postList = posts
    .map((p, i) => `Post ${i + 1} (id: ${p.id})\nTitle: ${p.title}\nBody: ${p.body?.slice(0, 400) || '(no body)'}`)
    .join('\n\n---\n\n');

  const prompt = `You are classifying Reddit posts for RNTell, a recruiterless travel nurse marketplace.

Classify each of the following ${posts.length} posts into exactly one category and assign 2–5 topic tags.

Categories:
${CATEGORY_DESCRIPTIONS}

Topic tag examples: ICU, California, tax_home, compact_license, housing_stipend, bill_rate, OT_pay, agency_margin, GSA_rates, first_contract, staffing_ratios, etc.

Posts to classify:
${postList}

Return ONLY a valid JSON array with exactly ${posts.length} objects, one per post, in the same order:
[
  {
    "id": "<exact post id from above>",
    "category": "<one category from the list>",
    "topics": ["<2-5 topic tags>"]
  },
  ...
]

Every post must be classified. Posts that don't fit any category get "uncategorized". Never omit a post.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 4096,
          response_mime_type: 'application/json',
        },
      }),
    }
  );

  if (!res.ok) throw new Error(`Gemini API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const parsed = JSON.parse(cleaned) as PostClassification[];

  return parsed.map((item) => ({
    id: item.id,
    category: VALID_CATEGORIES.includes(item.category) ? item.category : 'uncategorized',
    topics: Array.isArray(item.topics) ? item.topics.slice(0, 5) : [],
  }));
}

async function main() {
  console.log('RNTell KB Classifier starting...');
  console.log(`Model: ${MODEL} | Batch size: ${BATCH_SIZE} posts per API call`);

  let totalClassified = 0;
  let page = 0;

  while (true) {
    const { data: posts, error } = await supabase
      .from('kb_posts')
      .select('id, title, body')
      .is('category', null)
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (error) {
      console.error('Failed to fetch posts:', error.message);
      break;
    }

    if (!posts || posts.length === 0) {
      console.log('No more unclassified posts.');
      break;
    }

    page++;
    console.log(`\nBatch ${page}: classifying ${posts.length} posts...`);

    let classifications: PostClassification[];
    try {
      classifications = await classifyBatch(posts as KBPost[]);
    } catch (err) {
      console.error(`Batch ${page} classification failed:`, err);
      classifications = (posts as KBPost[]).map((p) => ({
        id: p.id,
        category: 'uncategorized',
        topics: [],
      }));
    }

    for (const c of classifications) {
      const { error: updateErr } = await supabase
        .from('kb_posts')
        .update({ category: c.category, topics: c.topics })
        .eq('id', c.id);

      if (updateErr) {
        console.error(`Failed to update post ${c.id}:`, updateErr.message);
      } else {
        totalClassified++;
        console.log(`  [${c.category}] ${c.topics.join(', ')} — ${c.id}`);
      }
    }

    // Upsert topic mentions for this batch
    const today = new Date().toISOString().split('T')[0];
    const allTopics = classifications.flatMap((c) => c.topics);
    const topicCounts: Record<string, number> = {};
    for (const t of allTopics) topicCounts[t] = (topicCounts[t] || 0) + 1;
    for (const [topic, count] of Object.entries(topicCounts)) {
      await supabase
        .from('kb_topic_mentions')
        .upsert(
          { topic, mention_date: today, source: 'reddit', mention_count: count },
          { onConflict: 'topic,mention_date,source' }
        );
    }

    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log(`\nDone. Total posts classified: ${totalClassified}`);
}

main();
