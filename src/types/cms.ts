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
        section_key: 'how_it_works',
        label: 'How It Works',
        fields: [
          { key: 'headline', label: 'Section Headline', type: 'text' },
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
