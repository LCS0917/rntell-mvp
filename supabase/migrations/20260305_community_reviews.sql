-- Community reviews extracted from Reddit KB posts tagged as facility_reviews.
-- facility_id is NULL until matched via admin UI.
create table public.community_reviews (
  id                    uuid primary key default gen_random_uuid(),
  kb_post_id            uuid unique references public.kb_posts on delete cascade,
  facility_name_extracted text not null,       -- Gemini-extracted facility name
  facility_id           uuid references public.facilities on delete set null,
  review_text           text not null,          -- post body (the review content)
  post_title            text not null,          -- original Reddit post title
  score                 int not null default 0, -- Reddit upvotes
  reddit_url            text,
  subreddit             text,
  posted_at             timestamptz,
  created_at            timestamptz not null default now()
);

create index idx_community_reviews_facility on public.community_reviews (facility_id) where facility_id is not null;
create index idx_community_reviews_unmatched on public.community_reviews (facility_id) where facility_id is null;
create index idx_community_reviews_name on public.community_reviews (facility_name_extracted);

alter table public.community_reviews enable row level security;
create policy "Community reviews are public" on public.community_reviews for select using (true);
