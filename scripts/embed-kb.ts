// /scripts/embed-kb.ts
// Usage: npx ts-node -r tsconfig-paths/register scripts/embed-kb.ts
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const EMBEDDING_MODEL = 'gemini-embedding-001';
const SYNTHESIS_MODEL = 'gemini-2.5-flash-lite';
const EMBED_BATCH_SIZE = 1000;
const SYNTH_BATCH_SIZE = 25;
const EMBEDDING_DIMS = 3072;

interface KBPost {
  id: string;
  title: string;
  body: string | null;
  category: string | null;
  topics: string[];
  subreddit: string | null;
}
interface KBComment {
  id: string;
  post_id: string;
  body: string;
}
interface SynthesisResult {
  question_text: string;
  answer_text: string;
  confidence: number;
  topics: string[];
}

async function embedText(text: string): Promise<number[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: { parts: [{ text }] } }),
    }
  );
  if (!res.ok) throw new Error(`Embedding API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.embedding.values;
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  return Promise.all(texts.map((t) => embedText(t)));
}

async function synthesizeQA(post: KBPost, comments: KBComment[]): Promise<SynthesisResult | null> {
  const commentText = comments
    .slice(0, 10)
    .map((c, i) => `Comment ${i + 1}: ${c.body.slice(0, 500)}`)
    .join('\n\n');

  const prompt = `You are building a knowledge base for RNTell, a recruiterless travel nurse marketplace.
Given this Reddit post and its top comments, extract the core question being asked and synthesize a high-quality, factual answer that would help travel nurses.
Focus on: pay rates, GSA benchmarks, contract negotiation, facility reviews, licensing, housing stipends, agency margins, and direct-hire strategies.
Post title: ${post.title}
Post body: ${post.body?.slice(0, 800) || '(no body)'}
Subreddit: r/${post.subreddit || 'unknown'}
Category: ${post.category || 'unknown'}
Topics: ${post.topics?.join(', ') || 'none'}
Top comments:
${commentText || '(no comments)'}
Return ONLY valid JSON matching this exact schema:
{
  "question_text": "<the core question this post is asking, rewritten clearly>",
  "answer_text": "<synthesized answer, 2-4 paragraphs, factual, actionable, nurse-focused. Reference GSA rates or market data where relevant>",
  "confidence": <0.0 to 1.0 — how confident you are in the answer quality>,
  "topics": ["<2-5 topic tags inherited or refined from the post>"]
}
If the post is too vague or not answerable, return {"question_text": "", "answer_text": "", "confidence": 0, "topics": []}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${SYNTHESIS_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 2048,
          response_mime_type: 'application/json',
        },
      }),
    }
  );

  if (!res.ok) throw new Error(`Gemini API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  if (!cleaned) return null;

  try {
    const parsed = JSON.parse(cleaned) as SynthesisResult;
    if (!parsed.question_text || !parsed.answer_text) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function embedPosts() {
  const { data: posts, error } = await supabase
    .from('kb_posts')
    .select('id, title, body, category, topics, subreddit')
    .eq('is_embedded', false)
    .not('title', 'is', null)
    .limit(EMBED_BATCH_SIZE);
  if (error || !posts?.length) {
    console.log('No unembedded posts found.');
    return 0;
  }
  console.log(`Embedding ${posts.length} posts...`);
  let count = 0;
  for (const post of posts as KBPost[]) {
    const text = [post.title, post.body].filter(Boolean).join('\n\n').slice(0, 2000);
    try {
      const embedding = await embedText(text);
      const { error: updateErr } = await supabase
        .from('kb_posts')
        .update({ embedding: `[${embedding.join(',')}]`, is_embedded: true })
        .eq('id', post.id);
      if (updateErr) {
        console.error(`  [embedPosts] DB update failed for ${post.id}:`, JSON.stringify(updateErr));
      } else {
        count++;
      }
      await new Promise((r) => setTimeout(r, 100));
    } catch (err) {
      console.error(`Failed to embed post ${post.id}:`, err);
    }
  }
  return count;
}

async function embedComments() {
  const { data: comments, error } = await supabase
    .from('kb_comments')
    .select('id, body')
    .eq('is_embedded', false)
    .gte('score', 2)
    .limit(EMBED_BATCH_SIZE);
  if (error || !comments?.length) {
    console.log('No unembedded comments found.');
    return 0;
  }
  console.log(`Embedding ${comments.length} comments...`);
  let count = 0;
  for (const comment of comments as KBComment[]) {
    try {
      const embedding = await embedText(comment.body.slice(0, 1500));
      const { error: updateErr } = await supabase
        .from('kb_comments')
        .update({ embedding: `[${embedding.join(',')}]`, is_embedded: true })
        .eq('id', comment.id);
      if (updateErr) {
        console.error(`  [embedComments] DB update failed for ${comment.id}:`, JSON.stringify(updateErr));
      } else {
        count++;
      }
      await new Promise((r) => setTimeout(r, 100));
    } catch (err) {
      console.error(`Failed to embed comment ${comment.id}:`, err);
    }
  }
  return count;
}

async function synthesizeAndEmbedAnswers() {
  // First, get all post_ids that already have a synthesized question
  const { data: existingQs } = await supabase
    .from('kb_questions')
    .select('post_id');
  const alreadySynthesized = new Set((existingQs || []).map((q) => q.post_id));

  // Fetch eligible posts
  const { data: posts, error } = await supabase
    .from('kb_posts')
    .select('id, title, body, category, topics, subreddit')
    .eq('is_embedded', true)
    .not('category', 'is', null)
    .neq('category', 'other')
    .gte('num_comments', 3)
    .limit(SYNTH_BATCH_SIZE * 2); // fetch extra to account for already-done ones
  if (error || !posts?.length) {
    console.log('No posts ready for synthesis.');
    return 0;
  }

  // Filter out already-synthesized in JS, take up to SYNTH_BATCH_SIZE
  const toSynthesize = (posts as KBPost[])
    .filter((p) => !alreadySynthesized.has(p.id))
    .slice(0, SYNTH_BATCH_SIZE);

  if (!toSynthesize.length) {
    console.log('All fetched posts already synthesized.');
    return 0;
  }
  console.log(`Synthesizing Q&A for ${toSynthesize.length} posts (${alreadySynthesized.size} already done)...`);
  let count = 0;

  for (const post of toSynthesize) {
    const { data: comments } = await supabase
      .from('kb_comments')
      .select('id, post_id, body')
      .eq('post_id', post.id)
      .gte('score', 1)
      .order('score', { ascending: false })
      .limit(15);

    const synthesis = await synthesizeQA(post, (comments as KBComment[]) || []);
    if (!synthesis) continue;

    const { data: question, error: qError } = await supabase
      .from('kb_questions')
      .insert({
        post_id: post.id,
        question_text: synthesis.question_text,
        category: post.category,
        topics: synthesis.topics,
      })
      .select('id')
      .single();
    if (qError || !question) {
      console.error(`Failed to insert question for post ${post.id}:`, qError?.message);
      continue;
    }

    const { data: answer, error: aError } = await supabase
      .from('kb_answers')
      .insert({
        question_id: question.id,
        answer_text: synthesis.answer_text,
        source_post_ids: [post.id],
        model_used: SYNTHESIS_MODEL,
        confidence: synthesis.confidence,
        is_canonical: synthesis.confidence >= 0.85,
      })
      .select('id')
      .single();
    if (aError || !answer) {
      console.error(`Failed to insert answer for question ${question.id}:`, aError?.message);
      continue;
    }

    const qEmbedding = await embedText(synthesis.question_text);
    const { error: qUpdateErr } = await supabase
      .from('kb_questions')
      .update({ embedding: `[${qEmbedding.join(',')}]`, is_embedded: true })
      .eq('id', question.id);
    if (qUpdateErr) console.error(`  [synthesize] kb_questions update failed for ${question.id}:`, JSON.stringify(qUpdateErr));

    const aEmbedding = await embedText(synthesis.answer_text.slice(0, 2000));
    const { error: aUpdateErr } = await supabase
      .from('kb_answers')
      .update({ embedding: `[${aEmbedding.join(',')}]`, is_embedded: true })
      .eq('id', answer.id);
    if (aUpdateErr) console.error(`  [synthesize] kb_answers update failed for ${answer.id}:`, JSON.stringify(aUpdateErr));

    if (synthesis.confidence >= 0.85 && synthesis.topics.length > 0) {
      for (const topic of synthesis.topics.slice(0, 2)) {
        await supabase
          .from('kb_canonical_answers')
          .upsert(
            {
              topic,
              question_text: synthesis.question_text,
              answer_text: synthesis.answer_text,
              answer_id: answer.id,
              last_reviewed: new Date().toISOString(),
              is_active: true,
            },
            { onConflict: 'topic' }
          );
      }
    }

    count++;
    console.log(`  Synthesized: "${synthesis.question_text.slice(0, 60)}..." (confidence: ${synthesis.confidence})`);
    await new Promise((r) => setTimeout(r, 500));
  }
  return count;
}

async function main() {
  console.log('RNTell KB Embedder starting...');
  console.log(`Model: ${EMBEDDING_MODEL} (${EMBEDDING_DIMS}d) | Synthesis: ${SYNTHESIS_MODEL}`);

  // Phase 1: embed all posts
  let totalPosts = 0;
  let batch: number;
  do {
    batch = await embedPosts();
    totalPosts += batch;
  } while (batch > 0);
  console.log(`Total posts embedded: ${totalPosts}`);

  // Phase 2: embed all comments
  let totalComments = 0;
  do {
    batch = await embedComments();
    totalComments += batch;
  } while (batch > 0);
  console.log(`Total comments embedded: ${totalComments}`);

  // Phase 3: synthesize all ready posts
  let totalSynthesized = 0;
  do {
    batch = await synthesizeAndEmbedAnswers();
    totalSynthesized += batch;
  } while (batch > 0);
  console.log(`Total Q&A pairs synthesized: ${totalSynthesized}`);

  console.log('\nDone.');
}

main();
