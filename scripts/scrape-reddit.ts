// /scripts/scrape-reddit.ts
// Scrape-only: fetches all posts from r/TravelNursing and inserts them raw.
// No Gemini calls — classification is handled separately by classify-kb.ts.
// Usage: npx ts-node -r tsconfig-paths/register scripts/scrape-reddit.ts
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const SUBREDDIT = 'TravelNursing';
const TARGET_POSTS = 1000;
const BATCH_SIZE = 100; // Reddit public JSON max per request

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

async function main() {
  console.log(`RNTell KB Seeder — targeting ${TARGET_POSTS} posts from r/${SUBREDDIT}`);
  console.log('Mode: scrape-only (no Gemini). Run classify-kb.ts next to classify posts.');

  const { data: run } = await supabase
    .from('kb_scrape_runs')
    .insert({ source: 'reddit', subreddit: SUBREDDIT, status: 'running' })
    .select('id')
    .single();
  if (!run) { console.error('Failed to create scrape run'); process.exit(1); }
  console.log(`Scrape run ID: ${run.id}`);

  let allPosts: RedditPost[] = [];
  let after: string | undefined;

  while (allPosts.length < TARGET_POSTS) {
    console.log(`Fetching posts ${allPosts.length + 1}–${allPosts.length + BATCH_SIZE}...`);
    const { posts, after: nextAfter } = await fetchTopPosts(after);
    if (!posts.length) break;
    allPosts = allPosts.concat(posts);
    after = nextAfter ?? undefined;
    if (!nextAfter) break;
    await new Promise((r) => setTimeout(r, 2000));
  }

  allPosts = allPosts.slice(0, TARGET_POSTS);
  console.log(`Fetched ${allPosts.length} posts. Inserting...`);

  let inserted = 0;
  let skipped = 0;

  for (const post of allPosts) {
    // Skip if already in DB
    const { data: existing } = await supabase
      .from('kb_posts')
      .select('id')
      .eq('source', 'reddit')
      .eq('external_id', post.id)
      .single();
    if (existing?.id) { skipped++; continue; }

    const { data: insertedPost, error } = await supabase
      .from('kb_posts')
      .insert({
        scrape_run_id: run.id,
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
      console.error(`Insert failed for post ${post.id}:`, JSON.stringify(error, null, 2));
      continue;
    }

    inserted++;

    // Fetch and store top comments
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
          if (e && !e.message.includes('unique')) console.error(`Comment error: ${e.message}`);
        });
      }
    }

    if (inserted % 25 === 0) console.log(`Progress: ${inserted} posts inserted...`);
    await new Promise((r) => setTimeout(r, 500));
  }

  await supabase
    .from('kb_scrape_runs')
    .update({
      status: 'complete',
      posts_fetched: allPosts.length,
      posts_new: inserted,
      completed_at: new Date().toISOString(),
    })
    .eq('id', run.id);

  console.log(`\nDone. Inserted: ${inserted} | Skipped (already existed): ${skipped}`);
  console.log(`Next step: run classify-kb.ts to classify the ${inserted} new posts.`);
}

main();
