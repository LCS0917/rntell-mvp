CREATE TYPE blog_status AS ENUM ('draft', 'pending_approval', 'published', 'archived');
CREATE TYPE blog_source AS ENUM ('manual', 'ai_generated');
CREATE TYPE gen_queue_status AS ENUM ('queued', 'generating', 'generated', 'approved', 'rejected');

CREATE TABLE cms_pages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key      text NOT NULL,
  section_key   text NOT NULL,
  label         text NOT NULL,
  content       jsonb NOT NULL DEFAULT '{}',
  updated_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (page_key, section_key)
);
CREATE INDEX idx_cms_pages_page_key ON cms_pages(page_key);
ALTER TABLE cms_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cms_pages_public_read" ON cms_pages FOR SELECT USING (true);
CREATE POLICY "cms_pages_admin_write" ON cms_pages FOR ALL USING (EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'));

CREATE TABLE blog_posts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title               text NOT NULL,
  slug                text NOT NULL UNIQUE,
  excerpt             text,
  body                text NOT NULL DEFAULT '',
  cover_image_url     text,
  status              blog_status NOT NULL DEFAULT 'draft',
  source              blog_source NOT NULL DEFAULT 'manual',
  tags                text[] NOT NULL DEFAULT '{}',
  seo_title           text,
  seo_description     text,
  ai_prompt_context   text,
  source_question_ids uuid[],
  created_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_blog_posts_status ON blog_posts(status);
CREATE INDEX idx_blog_posts_published_at ON blog_posts(published_at DESC);
CREATE INDEX idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX idx_blog_posts_tags ON blog_posts USING GIN(tags);
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blog_posts_public_read" ON blog_posts FOR SELECT USING (status = 'published');
CREATE POLICY "blog_posts_admin_all" ON blog_posts FOR ALL USING (EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'));

CREATE TABLE blog_generation_queue (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suggested_title     text NOT NULL,
  ai_prompt           text NOT NULL,
  source_question_ids uuid[] NOT NULL DEFAULT '{}',
  trending_keywords   text[] NOT NULL DEFAULT '{}',
  status              gen_queue_status NOT NULL DEFAULT 'queued',
  generated_post_id   uuid REFERENCES blog_posts(id) ON DELETE SET NULL,
  error_message       text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_gen_queue_status ON blog_generation_queue(status);
ALTER TABLE blog_generation_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gen_queue_admin_all" ON blog_generation_queue FOR ALL USING (EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'));

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_cms_pages_updated_at BEFORE UPDATE ON cms_pages FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_blog_posts_updated_at BEFORE UPDATE ON blog_posts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_gen_queue_updated_at BEFORE UPDATE ON blog_generation_queue FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO cms_pages (page_key, section_key, label, content) VALUES
('homepage', 'hero', 'Hero Section', '{"headline": "Know your worth. Find your place. Connect directly.", "subheadline": "The recruiterless marketplace built for nurses. Real pay data. Direct hospital access. No middlemen.", "cta_primary": "Get Started Free", "cta_secondary": "Analyze My Offer"}'),
('homepage', 'how_it_works', 'How It Works', '{"headline": "Three steps to take back control"}'),
('homepage', 'cta_banner', 'Bottom CTA Banner', '{"headline": "Most platforms make agencies nicer. RNTell makes them unnecessary.", "cta": "Start for Free"}'),
('about', 'hero', 'Hero Section', '{"headline": "Built by nurses. Powered by data. Owned by no agency.", "body": "RNTell was born from a simple belief: nurses deserve to know what hospitals actually pay."}'),
('about', 'mission', 'Mission Statement', '{"headline": "Our Mission", "body": "To return economic power to the backbone of healthcare by eliminating information asymmetry between nurses and hospitals."}'),
('about', 'values', 'Values', '{"headline": "What we stand for"}'),
('blog', 'hero', 'Blog Hero', '{"headline": "The RNTell Journal", "subheadline": "Pay intelligence, career strategy, and the truth about travel nursing — written for nurses who want to stay ahead."}');
