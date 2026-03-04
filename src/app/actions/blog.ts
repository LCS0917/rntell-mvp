'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { BlogPost, BlogStatus } from '@/types/cms'

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim() + '-' + Date.now().toString(36)
}

export async function getBlogPosts(status?: BlogStatus): Promise<BlogPost[]> {
  const supabase = await createClient()
  let query = supabase.from('blog_posts').select('*').order('created_at', { ascending: false })
  if (status) query = query.eq('status', status)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('blog_posts').select('*').eq('slug', slug).single()
  if (error) return null
  return data
}

export async function getBlogPostById(id: string): Promise<BlogPost | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('blog_posts').select('*').eq('id', id).single()
  if (error) return null
  return data
}

export async function getPublishedBlogPosts(): Promise<BlogPost[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createBlogPost(input: {
  title: string; excerpt?: string; body: string; cover_image_url?: string
  tags?: string[]; seo_title?: string; seo_description?: string; status?: BlogStatus
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { data, error } = await supabase
    .from('blog_posts')
    .insert({
      title: input.title, slug: generateSlug(input.title),
      excerpt: input.excerpt ?? null, body: input.body,
      cover_image_url: input.cover_image_url ?? null,
      tags: input.tags ?? [], seo_title: input.seo_title ?? null,
      seo_description: input.seo_description ?? null,
      status: input.status ?? 'draft', source: 'manual', created_by: user.id,
    })
    .select('id').single()

  if (error) return { success: false, error: error.message }
  revalidatePath('/blog')
  revalidatePath('/admin/blog')
  return { success: true, id: data.id }
}

export async function updateBlogPost(
  id: string,
  input: Partial<{ title: string; excerpt: string; body: string; cover_image_url: string; tags: string[]; seo_title: string; seo_description: string; status: BlogStatus }>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const updates: Record<string, unknown> = { ...input }
  if (input.status === 'published') {
    const existing = await getBlogPostById(id)
    if (existing && !existing.published_at) {
      updates.published_at = new Date().toISOString()
      updates.approved_by = user.id
    }
  }

  const { error } = await supabase.from('blog_posts').update(updates).eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/blog')
  revalidatePath('/admin/blog')
  return { success: true }
}

export async function deleteBlogPost(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('blog_posts').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/blog')
  revalidatePath('/admin/blog')
  return { success: true }
}

export async function getGenerationQueue() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('blog_generation_queue')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function approveGeneratedPost(
  queueId: string, postId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  await supabase.from('blog_posts').update({
    status: 'published', published_at: new Date().toISOString(), approved_by: user.id,
  }).eq('id', postId)

  await supabase.from('blog_generation_queue').update({ status: 'approved' }).eq('id', queueId)
  revalidatePath('/blog')
  revalidatePath('/admin/blog')
  revalidatePath('/admin/blog/generate')
  return { success: true }
}

export async function rejectGeneratedPost(queueId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('blog_generation_queue').update({ status: 'rejected' }).eq('id', queueId)
  if (error) return { success: false, error: error.message }
  revalidatePath('/admin/blog/generate')
  return { success: true }
}

export async function getTrendingTopicsForGeneration(limit = 20) {
  const supabase = await createClient()
  const { data: topics, error } = await supabase
    .from('kb_topic_mentions')
    .select('*')
    .order('mention_count', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)

  const enriched = await Promise.all(
    (topics ?? []).map(async (topic: Record<string, unknown>) => {
      const { data: questions } = await supabase
        .from('kb_questions')
        .select('id, question_text, category')
        .contains('topics', [topic.topic])
        .limit(3)
      return { ...topic, sample_questions: questions ?? [] }
    })
  )
  return enriched
}
