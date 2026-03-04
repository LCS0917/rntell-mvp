-- Expand homepage CMS sections: add value_props, featured_jobs; expand how_it_works with step content

-- Update how_it_works with full step content
UPDATE cms_pages
SET content = '{
  "headline": "How It Works",
  "step1_title": "Analyze Your Offer",
  "step1_desc": "Enter your contract details or upload a PDF. Get an instant financial breakdown.",
  "step2_title": "Compare to Market",
  "step2_desc": "See how your pay, stipends, and benefits compare to GSA benchmarks and market data.",
  "step3_title": "Apply Direct",
  "step3_desc": "Apply directly to facilities. No middlemen. No margin on your pay."
}'::jsonb
WHERE page_key = 'homepage' AND section_key = 'how_it_works';

-- Add value_props section
INSERT INTO cms_pages (page_key, section_key, label, content) VALUES
('homepage', 'value_props', 'Value Propositions', '{
  "headline": "Know More. Earn More. Own Your Career.",
  "subheadline": "RNTell gives you the financial intelligence that was hidden behind middlemen.",
  "card1_title": "Real Take-Home Clarity",
  "card1_subtitle": "Net pay after housing, full stipend breakdown, and margin detection — so you know exactly what lands in your account.",
  "card2_title": "Federal & Long-Term Value Detection",
  "card2_subtitle": "Automatic PSLF eligibility detection, HRSA HPSA lookup, and a federal strength score for every contract you analyze.",
  "card3_title": "Smarter Job Matching",
  "card3_subtitle": "Smart Match scoring ranks jobs by specialty fit, license alignment, and financial strength — so you see the best opportunities first."
}'::jsonb)
ON CONFLICT DO NOTHING;

-- Add featured_jobs section
INSERT INTO cms_pages (page_key, section_key, label, content) VALUES
('homepage', 'featured_jobs', 'Featured Jobs', '{
  "headline": "Featured Assignments",
  "subheadline": "The latest direct-hire and verified opportunities.",
  "cta": "View All Jobs"
}'::jsonb)
ON CONFLICT DO NOTHING;
