-- /supabase/migrations/20240217_kb_vectors.sql
create extension if not exists vector with schema extensions;
set local search_path to public, extensions;
-- Add 768-dim embedding columns (text-embedding-004)
alter table public.kb_posts      add column embedding vector(768);
alter table public.kb_comments   add column embedding vector(768);
alter table public.kb_questions  add column embedding vector(768);
alter table public.kb_answers    add column embedding vector(768);
-- HNSW indexes for fast ANN search
create index idx_kb_posts_embedding
  on public.kb_posts
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);
create index idx_kb_questions_embedding
  on public.kb_questions
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);
create index idx_kb_answers_embedding
  on public.kb_answers
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);
create index idx_kb_comments_embedding
  on public.kb_comments
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);
-- -----------------------------------------------------------------------
-- Semantic search: posts
-- -----------------------------------------------------------------------
create or replace function match_kb_posts(
  query_embedding vector(768),
  match_threshold float default 0.5,
  match_count     int   default 10
)
returns table (
  id          uuid,
  title       text,
  body        text,
  category    text,
  topics      text[],
  subreddit   text,
  score       int,
  posted_at   timestamptz,
  similarity  float
)
language sql stable
as $$
  select
    p.id,
    p.title,
    p.body,
    p.category,
    p.topics,
    p.subreddit,
    p.score,
    p.posted_at,
    1 - (p.embedding <=> query_embedding) as similarity
  from public.kb_posts p
  where p.embedding is not null
    and 1 - (p.embedding <=> query_embedding) > match_threshold
  order by p.embedding <=> query_embedding
  limit match_count;
$$;
-- -----------------------------------------------------------------------
-- Semantic search: questions
-- -----------------------------------------------------------------------
create or replace function match_kb_questions(
  query_embedding vector(768),
  match_threshold float default 0.5,
  match_count     int   default 10
)
returns table (
  id            uuid,
  question_text text,
  category      text,
  topics        text[],
  similarity    float
)
language sql stable
as $$
  select
    q.id,
    q.question_text,
    q.category,
    q.topics,
    1 - (q.embedding <=> query_embedding) as similarity
  from public.kb_questions q
  where q.embedding is not null
    and 1 - (q.embedding <=> query_embedding) > match_threshold
  order by q.embedding <=> query_embedding
  limit match_count;
$$;
-- -----------------------------------------------------------------------
-- Semantic search: answers
-- -----------------------------------------------------------------------
create or replace function match_kb_answers(
  query_embedding vector(768),
  match_threshold float default 0.5,
  match_count     int   default 10
)
returns table (
  id          uuid,
  answer_text text,
  confidence  numeric,
  is_canonical boolean,
  similarity  float
)
language sql stable
as $$
  select
    a.id,
    a.answer_text,
    a.confidence,
    a.is_canonical,
    1 - (a.embedding <=> query_embedding) as similarity
  from public.kb_answers a
  where a.embedding is not null
    and 1 - (a.embedding <=> query_embedding) > match_threshold
  order by a.embedding <=> query_embedding
  limit match_count;
$$;
-- -----------------------------------------------------------------------
-- Hybrid search: RRF over posts (semantic + keyword)
-- Reciprocal Rank Fusion: score = 1/(k + rank), k=60 is standard
-- -----------------------------------------------------------------------
create or replace function hybrid_search_kb_posts(
  query_text      text,
  query_embedding vector(768),
  match_count     int   default 10,
  rrf_k           int   default 60
)
returns table (
  id         uuid,
  title      text,
  body       text,
  category   text,
  topics     text[],
  subreddit  text,
  rrf_score  float
)
language sql stable
as $$
  with semantic as (
    select
      p.id,
      row_number() over (order by p.embedding <=> query_embedding) as rank
    from public.kb_posts p
    where p.embedding is not null
    order by p.embedding <=> query_embedding
    limit 50
  ),
  keyword as (
    select
      p.id,
      row_number() over (
        order by ts_rank_cd(
          to_tsvector('english', coalesce(p.title,'') || ' ' || coalesce(p.body,'')),
          plainto_tsquery('english', query_text)
        ) desc
      ) as rank
    from public.kb_posts p
    where to_tsvector('english', coalesce(p.title,'') || ' ' || coalesce(p.body,''))
          @@ plainto_tsquery('english', query_text)
    limit 50
  ),
  fused as (
    select
      coalesce(s.id, k.id) as id,
      coalesce(1.0 / (rrf_k + s.rank), 0) +
      coalesce(1.0 / (rrf_k + k.rank), 0) as rrf_score
    from semantic s
    full outer join keyword k on s.id = k.id
  )
  select
    p.id,
    p.title,
    p.body,
    p.category,
    p.topics,
    p.subreddit,
    f.rrf_score
  from fused f
  join public.kb_posts p on p.id = f.id
  order by f.rrf_score desc
  limit match_count;
$$;
-- -----------------------------------------------------------------------
-- Hybrid search: RRF over answers
-- -----------------------------------------------------------------------
create or replace function hybrid_search_kb_answers(
  query_text      text,
  query_embedding vector(768),
  match_count     int   default 10,
  rrf_k           int   default 60
)
returns table (
  id           uuid,
  answer_text  text,
  is_canonical boolean,
  confidence   numeric,
  rrf_score    float
)
language sql stable
as $$
  with semantic as (
    select
      a.id,
      row_number() over (order by a.embedding <=> query_embedding) as rank
    from public.kb_answers a
    where a.embedding is not null
    order by a.embedding <=> query_embedding
    limit 50
  ),
  keyword as (
    select
      a.id,
      row_number() over (
        order by ts_rank_cd(
          to_tsvector('english', a.answer_text),
          plainto_tsquery('english', query_text)
        ) desc
      ) as rank
    from public.kb_answers a
    where to_tsvector('english', a.answer_text)
          @@ plainto_tsquery('english', query_text)
    limit 50
  ),
  fused as (
    select
      coalesce(s.id, k.id) as id,
      coalesce(1.0 / (rrf_k + s.rank), 0) +
      coalesce(1.0 / (rrf_k + k.rank), 0) as rrf_score
    from semantic s
    full outer join keyword k on s.id = k.id
  )
  select
    a.id,
    a.answer_text,
    a.is_canonical,
    a.confidence,
    f.rrf_score
  from fused f
  join public.kb_answers a on a.id = f.id
  order by f.rrf_score desc
  limit match_count;
$$;
-- -----------------------------------------------------------------------
-- Trending topics (last N days)
-- -----------------------------------------------------------------------
create or replace function get_trending_topics(
  days_back int default 7,
  topic_limit int default 20
)
returns table (
  topic         text,
  total_mentions bigint,
  latest_date   date
)
language sql stable
as $$
  select
    topic,
    sum(mention_count) as total_mentions,
    max(mention_date)  as latest_date
  from public.kb_topic_mentions
  where mention_date >= current_date - days_back
  group by topic
  order by total_mentions desc
  limit topic_limit;
$$;
