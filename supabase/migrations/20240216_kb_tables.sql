-- /supabase/migrations/20240102_kb_tables.sql
create extension if not exists "uuid-ossp" with schema extensions;
-- Scrape run tracking
create table public.kb_scrape_runs (
  id              uuid primary key default gen_random_uuid(),
  source          text not null default 'reddit',
  subreddit       text,
  posts_fetched   int not null default 0,
  posts_new       int not null default 0,
  status          text not null default 'pending'
                  check (status in ('pending','running','complete','failed')),
  error_message   text,
  started_at      timestamptz not null default now(),
  completed_at    timestamptz
);
-- Raw Reddit posts
create table public.kb_posts (
  id              uuid primary key default gen_random_uuid(),
  scrape_run_id   uuid references public.kb_scrape_runs on delete set null,
  source          text not null default 'reddit',
  external_id     text not null,                    -- Reddit post ID (t3_xxxx)
  subreddit       text,
  title           text not null,
  body            text,
  url             text,
  author          text,
  score           int default 0,
  num_comments    int default 0,
  permalink       text,
  category        text,                             -- Gemini classification
  topics          text[] default '{}',              -- extracted topic tags
  is_embedded     boolean not null default false,
  posted_at       timestamptz,
  scraped_at      timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  unique (source, external_id)
);
-- Raw Reddit comments
create table public.kb_comments (
  id              uuid primary key default gen_random_uuid(),
  post_id         uuid not null references public.kb_posts on delete cascade,
  external_id     text not null,                    -- Reddit comment ID (t1_xxxx)
  body            text not null,
  author          text,
  score           int default 0,
  parent_id       text,                             -- parent comment external_id
  depth           smallint default 0,
  is_embedded     boolean not null default false,
  posted_at       timestamptz,
  created_at      timestamptz not null default now(),
  unique (post_id, external_id)
);
-- Synthesized KB questions (derived from posts)
create table public.kb_questions (
  id              uuid primary key default gen_random_uuid(),
  post_id         uuid references public.kb_posts on delete set null,
  question_text   text not null,
  category        text,
  topics          text[] default '{}',
  source          text not null default 'reddit',
  is_embedded     boolean not null default false,
  created_at      timestamptz not null default now()
);
-- Synthesized KB answers
create table public.kb_answers (
  id              uuid primary key default gen_random_uuid(),
  question_id     uuid not null references public.kb_questions on delete cascade,
  answer_text     text not null,
  source_post_ids uuid[] default '{}',              -- posts used to synthesize
  model_used      text default 'gemini-2.0-flash',
  confidence      numeric(4,3),                     -- 0.000–1.000
  is_canonical    boolean not null default false,
  is_embedded     boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
-- Answer upvotes/downvotes
create table public.kb_answer_votes (
  id          uuid primary key default gen_random_uuid(),
  answer_id   uuid not null references public.kb_answers on delete cascade,
  user_id     uuid references public.profiles on delete set null,
  vote        smallint not null check (vote in (-1, 1)),
  created_at  timestamptz not null default now(),
  unique (answer_id, user_id)
);
-- Topic mention counting for trending
create table public.kb_topic_mentions (
  id            uuid primary key default gen_random_uuid(),
  topic         text not null,
  mention_date  date not null default current_date,
  mention_count int not null default 1,
  source        text not null default 'reddit',
  created_at    timestamptz not null default now(),
  unique (topic, mention_date, source)
);
-- Curated canonical answers per topic
create table public.kb_canonical_answers (
  id              uuid primary key default gen_random_uuid(),
  topic           text not null unique,
  question_text   text not null,
  answer_text     text not null,
  answer_id       uuid references public.kb_answers on delete set null,
  last_reviewed   timestamptz not null default now(),
  reviewed_by     uuid references public.profiles on delete set null,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
-- Indexes
create index idx_kb_posts_category       on public.kb_posts (category);
create index idx_kb_posts_subreddit      on public.kb_posts (subreddit);
create index idx_kb_posts_is_embedded    on public.kb_posts (is_embedded) where is_embedded = false;
create index idx_kb_posts_external_id    on public.kb_posts (source, external_id);
create index idx_kb_comments_post_id     on public.kb_comments (post_id);
create index idx_kb_comments_embedded    on public.kb_comments (is_embedded) where is_embedded = false;
create index idx_kb_questions_category   on public.kb_questions (category);
create index idx_kb_questions_embedded   on public.kb_questions (is_embedded) where is_embedded = false;
create index idx_kb_answers_question     on public.kb_answers (question_id);
create index idx_kb_answers_canonical    on public.kb_answers (is_canonical) where is_canonical = true;
create index idx_kb_topic_mentions_topic on public.kb_topic_mentions (topic, mention_date desc);
create index idx_kb_canonical_topic      on public.kb_canonical_answers (topic);
-- RLS
alter table public.kb_posts             enable row level security;
alter table public.kb_comments          enable row level security;
alter table public.kb_questions         enable row level security;
alter table public.kb_answers           enable row level security;
alter table public.kb_answer_votes      enable row level security;
alter table public.kb_scrape_runs       enable row level security;
alter table public.kb_topic_mentions    enable row level security;
alter table public.kb_canonical_answers enable row level security;
create policy "KB posts are public"             on public.kb_posts             for select using (true);
create policy "KB comments are public"          on public.kb_comments          for select using (true);
create policy "KB questions are public"         on public.kb_questions         for select using (true);
create policy "KB answers are public"           on public.kb_answers           for select using (true);
create policy "KB topic mentions are public"    on public.kb_topic_mentions    for select using (true);
create policy "KB canonical answers are public" on public.kb_canonical_answers for select using (true);
create policy "Authenticated users can vote"
  on public.kb_answer_votes for insert
  with check (auth.uid() is not null);
create policy "Users can update own votes"
  on public.kb_answer_votes for update
  using (auth.uid() = user_id);
