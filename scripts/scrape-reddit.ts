// /scripts/scrape-reddit.ts
// Scrape-only: fetches posts from r/TravelNursing via top posts AND search queries.
// No Gemini calls — classification is handled separately by classify-kb.ts.
//
// Usage:
//   npx ts-node -r tsconfig-paths/register scripts/scrape-reddit.ts
//   npx ts-node -r tsconfig-paths/register scripts/scrape-reddit.ts --search-only
//
// --search-only  Skip top-posts fetch, only run search queries (faster re-runs)

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const SUBREDDIT = 'TravelNursing';
const TARGET_POSTS = 1000;
const BATCH_SIZE = 100; // Reddit public JSON max per request

// Search queries to find facility-mentioning posts (potential reviews)
const SEARCH_QUERIES = [
  'medical center',
  'hospital',
  'regional medical',
  'community hospital',
  'facility review',
  'facility experience',
  'avoid this facility',
  'great facility',
  'worst hospital',
  'best hospital',
  'contract cut',
  'staffing ratios',
];

interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  url: string;
  author: string;
  score: number;
  num_comments: number;
  permalink: string;
  created_utc: number;
}

interface RedditComment {
  id: string;
  body: string;
  author: string;
  score: number;
  parent_id: string;
  depth: number;
  created_utc: number;
  replies?: { data: { children: Array<{ kind: string; data: RedditComment }> } };
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

async function fetchTopPosts(after?: string): Promise<{ posts: RedditPost[]; after: string | null }> {
  const url = `https://www.reddit.com/r/${SUBREDDIT}/top.json?limit=${BATCH_SIZE}&t=all${after ? `&after=${after}` : ''}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'RNTell-KB-Seeder/1.0' },
  });
  if (!res.ok) throw new Error(`Reddit fetch failed: ${res.status}`);
  const data = await res.json();
  return {
    posts: data.data.children.map((c: { data: RedditPost }) => c.data),
    after: data.data.after,
  };
}

async function fetchSearchPosts(
  query: string,
  after?: string
): Promise<{ posts: RedditPost[]; after: string | null }> {
  const q = encodeURIComponent(query);
  const url = `https://www.reddit.com/r/${SUBREDDIT}/search.json?q=${q}&restrict_sr=on&sort=relevance&t=all&limit=${BATCH_SIZE}${after ? `&after=${after}` : ''}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'RNTell-KB-Seeder/1.0' },
  });
  if (!res.ok) {
    console.error(`  Search fetch failed for "${query}": ${res.status}`);
    return { posts: [], after: null };
  }
  const data = await res.json();
  return {
    posts: data.data.children.map((c: { data: RedditPost }) => c.data),
    after: data.data.after,
  };
}

async function fetchPostComments(permalink: string): Promise<RedditComment[]> {
  const url = `https://www.reddit.com${permalink}.json?limit=25&depth=2`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'RNTell-KB-Seeder/1.0' },
  });
  if (!res.ok) return [];
  const data = await res.json();
  const children = data[1]?.data?.children ?? [];
  return flattenComments(children);
}

function flattenComments(
  children: Array<{ kind: string; data: RedditComment }>,
  depth = 0
): RedditComment[] {
  const flat: RedditComment[] = [];
  for (const child of children) {
    if (child.kind !== 't1') continue;
    const c = child.data;
    if (c.body === '[deleted]' || c.body === '[removed]') continue;
    flat.push({ ...c, depth });
    if (c.replies?.data?.children?.length) {
      flat.push(...flattenComments(c.replies.data.children, depth + 1));
    }
  }
  return flat;
}

// ---------------------------------------------------------------------------
// Insert a post + its comments (shared by both top-posts and search paths)
// ---------------------------------------------------------------------------

async function insertPost(
  post: RedditPost,
  runId: string
): Promise<'inserted' | 'skipped' | 'error'> {
  // Skip if already in DB
  const { data: existing } = await supabase
    .from('kb_posts')
    .select('id')
    .eq('source', 'reddit')
    .eq('external_id', post.id)
    .single();
  if (existing?.id) return 'skipped';

  const { data: insertedPost, error } = await supabase
    .from('kb_posts')
    .insert({
      scrape_run_id: runId,
      source: 'reddit',
      external_id: post.id,
      subreddit: SUBREDDIT,
      title: post.title,
      body: post.selftext || null,
      url: `https://reddit.com${post.permalink}`,
      author: post.author,
      score: post.score,
      num_comments: post.num_comments,
      permalink: post.permalink,
      category: null,
      topics: [],
      posted_at: new Date(post.created_utc * 1000).toISOString(),
    })
    .select('id')
    .single();

  if (error || !insertedPost) {
    console.error(`  Insert failed for post ${post.id}:`, error?.message);
    return 'error';
  }

  // Fetch and store comments
  if (post.num_comments > 0) {
    const comments = await fetchPostComments(post.permalink);
    const topComments = comments.filter((c) => c.score > 1).slice(0, 15);
    for (const comment of topComments) {
      await supabase.from('kb_comments').insert({
        post_id: insertedPost.id,
        external_id: comment.id,
        body: comment.body,
        author: comment.author,
        score: comment.score,
        parent_id: comment.parent_id,
        depth: comment.depth,
        posted_at: new Date(comment.created_utc * 1000).toISOString(),
      }).then(({ error: e }) => {
        if (e && !e.message.includes('unique')) console.error(`  Comment error: ${e.message}`);
      });
    }
  }

  return 'inserted';
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const searchOnly = process.argv.includes('--search-only');

  console.log(`RNTell KB Seeder — r/${SUBREDDIT}`);
  console.log(`Mode: ${searchOnly ? 'search-only' : 'top-posts + search'}`);
  console.log('No Gemini calls. Run classify-kb.ts next to classify new posts.\n');

  const { data: run } = await supabase
    .from('kb_scrape_runs')
    .insert({ source: 'reddit', subreddit: SUBREDDIT, status: 'running' })
    .select('id')
    .single();
  if (!run) { console.error('Failed to create scrape run'); process.exit(1); }
  console.log(`Scrape run ID: ${run.id}`);

  let totalFetched = 0;
  let totalInserted = 0;
  let totalSkipped = 0;

  // ── Phase 1: Top posts (unless --search-only) ──
  if (!searchOnly) {
    console.log(`\n── Phase 1: Fetching top ${TARGET_POSTS} posts ──`);
    let allPosts: RedditPost[] = [];
    let after: string | undefined;

    while (allPosts.length < TARGET_POSTS) {
      console.log(`  Fetching posts ${allPosts.length + 1}–${allPosts.length + BATCH_SIZE}...`);
      const { posts, after: nextAfter } = await fetchTopPosts(after);
      if (!posts.length) break;
      allPosts = allPosts.concat(posts);
      after = nextAfter ?? undefined;
      if (!nextAfter) break;
      await new Promise((r) => setTimeout(r, 2000));
    }

    allPosts = allPosts.slice(0, TARGET_POSTS);
    console.log(`  Fetched ${allPosts.length} top posts. Inserting...`);
    totalFetched += allPosts.length;

    for (const post of allPosts) {
      const result = await insertPost(post, run.id);
      if (result === 'inserted') totalInserted++;
      if (result === 'skipped') totalSkipped++;
      if (totalInserted % 25 === 0 && totalInserted > 0) {
        console.log(`  Progress: ${totalInserted} inserted...`);
      }
      await new Promise((r) => setTimeout(r, 500));
    }

    console.log(`  Top posts done. Inserted: ${totalInserted} | Skipped: ${totalSkipped}`);
  }

  // ── Phase 2: Search queries ──
  console.log(`\n── Phase 2: Searching ${SEARCH_QUERIES.length} queries ──`);

  for (const query of SEARCH_QUERIES) {
    console.log(`\n  Searching: "${query}"`);
    let searchPosts: RedditPost[] = [];
    let after: string | undefined;
    let pages = 0;

    // Paginate up to 250 results per query (Reddit search caps ~250 anyway)
    while (searchPosts.length < 250 && pages < 3) {
      const { posts, after: nextAfter } = await fetchSearchPosts(query, after);
      if (!posts.length) break;
      searchPosts = searchPosts.concat(posts);
      after = nextAfter ?? undefined;
      pages++;
      if (!nextAfter) break;
      await new Promise((r) => setTimeout(r, 2000));
    }

    console.log(`    Found ${searchPosts.length} results`);
    totalFetched += searchPosts.length;

    let queryInserted = 0;
    let querySkipped = 0;

    for (const post of searchPosts) {
      const result = await insertPost(post, run.id);
      if (result === 'inserted') { totalInserted++; queryInserted++; }
      if (result === 'skipped') { totalSkipped++; querySkipped++; }
      await new Promise((r) => setTimeout(r, 500));
    }

    console.log(`    Inserted: ${queryInserted} | Skipped: ${querySkipped}`);
  }

  // ── Finalize ──
  await supabase
    .from('kb_scrape_runs')
    .update({
      status: 'complete',
      posts_fetched: totalFetched,
      posts_new: totalInserted,
      completed_at: new Date().toISOString(),
    })
    .eq('id', run.id);

  console.log(`\n════════════════════════════════════════`);
  console.log(`Done. Total fetched: ${totalFetched} | Inserted: ${totalInserted} | Skipped: ${totalSkipped}`);
  console.log(`Next step: run classify-kb.ts to classify the ${totalInserted} new posts.`);
}

main();
