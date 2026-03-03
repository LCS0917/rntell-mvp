-- /supabase/migrations/20240104_kb_vectors_3072.sql
-- Resize embedding columns from vector(768) to vector(3072) to match
-- gemini-embedding-001 output dimensions. Drop and recreate HNSW indexes
-- and replace all search functions with the corrected parameter type.

set local search_path to public, extensions;

-- -----------------------------------------------------------------------
-- 1. Drop HNSW indexes (must be done before altering column type)
-- -----------------------------------------------------------------------
drop index if exists public.idx_kb_posts_embedding;
drop index if exists public.idx_kb_comments_embedding;
drop index if exists public.idx_kb_questions_embedding;
drop index if exists public.idx_kb_answers_embedding;

-- -----------------------------------------------------------------------
-- 2. Alter columns from vector(768) → vector(3072)
--    Also null out any previously stored (wrong-dim) values just in case.
-- -----------------------------------------------------------------------
alter table public.kb_posts     alter column embedding type vector(3072) using null;
alter table public.kb_comments  alter column embedding type vector(3072) using null;
alter table public.kb_questions alter column embedding type vector(3072) using null;
alter table public.kb_answers   alter column embedding type vector(3072) using null;

-- Also reset is_embedded flags so the script re-processes everything cleanly
update public.kb_posts     set is_embedded = false where embedding is null;
update public.kb_comments  set is_embedded = false where embedding is null;
update public.kb_questions set is_embedded = false where embedding is null;
update public.kb_answers   set is_embedded = false where embedding is null;

-- NOTE: HNSW indexes are limited to 2000 dimensions in pgvector.
-- At ~500 posts, sequential cosine scan is fast enough without an index.
-- If this KB grows beyond ~10k rows, consider IVFFlat with reduced dims
-- or upgrading to pgvector 0.7+ halfvec support.

-- -----------------------------------------------------------------------
-- 4. Replace search functions with vector(3072) signatures
-- -----------------------------------------------------------------------
create or replace function match_kb_posts(
  query_embedding vector(3072),
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

create or replace function match_kb_questions(
  query_embedding vector(3072),
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

create or replace function match_kb_answers(
  query_embedding vector(3072),
  match_threshold float default 0.5,
  match_count     int   default 10
)
returns table (
  id           uuid,
  answer_text  text,
  confidence   numeric,
  is_canonical boolean,
  similarity   float
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

create or replace function hybrid_search_kb_posts(
  query_text      text,
  query_embedding vector(3072),
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

create or replace function hybrid_search_kb_answers(
  query_text      text,
  query_embedding vector(3072),
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
