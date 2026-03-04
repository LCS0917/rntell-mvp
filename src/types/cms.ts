export type BlogStatus = 'draft' | 'pending_approval' | 'published' | 'archived'
export type BlogSource = 'manual' | 'ai_generated'
export type GenQueueStatus = 'queued' | 'generating' | 'generated' | 'approved' | 'rejected'

export interface CmsPage {
  id: string
  page_key: string
  section_key: string
  label: string
  content: Record<string, unknown>
  updated_by: string | null
  updated_at: string
  created_at: string
}

export interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string | null
  body: string
  cover_image_url: string | null
  status: BlogStatus
  source: BlogSource
  tags: string[]
  seo_title: string | null
  seo_description: string | null
  ai_prompt_context: string | null
  source_question_ids: string[] | null
  created_by: string | null
  approved_by: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface BlogGenerationQueueItem {
  id: string
  suggested_title: string
  ai_prompt: string
  source_question_ids: string[]
  trending_keywords: string[]
  status: GenQueueStatus
  generated_post_id: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export type CmsFieldType = 'text' | 'textarea' | 'richtext' | 'url'

export interface CmsFieldDefinition {
  key: string
  label: string
  type: CmsFieldType
  placeholder?: string
}

export interface CmsSectionDefinition {
  section_key: string
  label: string
  fields: CmsFieldDefinition[]
}

export interface CmsPageDefinition {
  page_key: string
  label: string
  sections: CmsSectionDefinition[]
}

export const CMS_PAGE_DEFINITIONS: CmsPageDefinition[] = [
  {
    page_key: 'homepage',
    label: 'Homepage',
    sections: [
      {
        section_key: 'hero',
        label: 'Hero Section',
        fields: [
          { key: 'headline', label: 'Headline', type: 'text' },
          { key: 'subheadline', label: 'Subheadline', type: 'textarea' },
          { key: 'cta_primary', label: 'Primary CTA Button Text', type: 'text' },
          { key: 'cta_secondary', label: 'Secondary CTA Button Text', type: 'text' },
        ],
      },
      {
        section_key: 'value_props',
        label: 'Value Propositions',
        fields: [
          { key: 'headline', label: 'Section Headline', type: 'text', placeholder: 'Know More. Earn More. Own Your Career.' },
          { key: 'subheadline', label: 'Section Subheadline', type: 'textarea', placeholder: 'RNTell gives you the financial intelligence...' },
          { key: 'card1_title', label: 'Card 1 Title', type: 'text', placeholder: 'Real Take-Home Clarity' },
          { key: 'card1_subtitle', label: 'Card 1 Description', type: 'textarea' },
          { key: 'card2_title', label: 'Card 2 Title', type: 'text', placeholder: 'Federal & Long-Term Value Detection' },
          { key: 'card2_subtitle', label: 'Card 2 Description', type: 'textarea' },
          { key: 'card3_title', label: 'Card 3 Title', type: 'text', placeholder: 'Smarter Job Matching' },
          { key: 'card3_subtitle', label: 'Card 3 Description', type: 'textarea' },
        ],
      },
      {
        section_key: 'how_it_works',
        label: 'How It Works',
        fields: [
          { key: 'headline', label: 'Section Headline', type: 'text', placeholder: 'How It Works' },
          { key: 'step1_title', label: 'Step 1 Title', type: 'text', placeholder: 'Analyze Your Offer' },
          { key: 'step1_desc', label: 'Step 1 Description', type: 'textarea', placeholder: 'Enter your contract details or upload a PDF. Get an instant financial breakdown.' },
          { key: 'step2_title', label: 'Step 2 Title', type: 'text', placeholder: 'Compare to Market' },
          { key: 'step2_desc', label: 'Step 2 Description', type: 'textarea', placeholder: 'See how your pay, stipends, and benefits compare to GSA benchmarks and market data.' },
          { key: 'step3_title', label: 'Step 3 Title', type: 'text', placeholder: 'Apply Direct' },
          { key: 'step3_desc', label: 'Step 3 Description', type: 'textarea', placeholder: 'Apply directly to facilities. No middlemen. No margin on your pay.' },
        ],
      },
      {
        section_key: 'featured_jobs',
        label: 'Featured Jobs',
        fields: [
          { key: 'headline', label: 'Section Headline', type: 'text', placeholder: 'Featured Assignments' },
          { key: 'subheadline', label: 'Section Subheadline', type: 'textarea', placeholder: 'The latest direct-hire and verified opportunities.' },
          { key: 'cta', label: 'CTA Button Text', type: 'text', placeholder: 'View All Jobs' },
        ],
      },
      {
        section_key: 'cta_banner',
        label: 'Bottom CTA Banner',
        fields: [
          { key: 'headline', label: 'Banner Headline', type: 'textarea' },
          { key: 'cta', label: 'CTA Button Text', type: 'text' },
        ],
      },
    ],
  },
  {
    page_key: 'about',
    label: 'About',
    sections: [
      {
        section_key: 'hero',
        label: 'Hero Section',
        fields: [
          { key: 'headline', label: 'Headline', type: 'text' },
          { key: 'body', label: 'Body Text', type: 'textarea' },
        ],
      },
      {
        section_key: 'mission',
        label: 'Mission Statement',
        fields: [
          { key: 'headline', label: 'Section Headline', type: 'text' },
          { key: 'body', label: 'Mission Text', type: 'textarea' },
        ],
      },
      {
        section_key: 'values',
        label: 'Values',
        fields: [
          { key: 'headline', label: 'Section Headline', type: 'text' },
        ],
      },
    ],
  },
  {
    page_key: 'blog',
    label: 'Blog Feed',
    sections: [
      {
        section_key: 'hero',
        label: 'Blog Hero',
        fields: [
          { key: 'headline', label: 'Page Headline', type: 'text' },
          { key: 'subheadline', label: 'Subheadline', type: 'textarea' },
        ],
      },
    ],
  },
]
