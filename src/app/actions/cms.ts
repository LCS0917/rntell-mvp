'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import type { CmsPage } from '@/types/cms'

export async function getCmsPage(pageKey: string): Promise<CmsPage[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cms_pages')
    .select('*')
    .eq('page_key', pageKey)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getCmsSection(
  pageKey: string,
  sectionKey: string
): Promise<CmsPage | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cms_pages')
    .select('*')
    .eq('page_key', pageKey)
    .eq('section_key', sectionKey)
    .single()
  if (error) return null
  return data
}

export async function updateCmsSection(
  pageKey: string,
  sectionKey: string,
  content: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { error } = await supabase
    .from('cms_pages')
    .update({ content, updated_by: user.id })
    .eq('page_key', pageKey)
    .eq('section_key', sectionKey)

  if (error) return { success: false, error: error.message }

  const pathMap: Record<string, string> = { homepage: '/', about: '/about', blog: '/blog' }
  if (pathMap[pageKey]) revalidatePath(pathMap[pageKey])
  revalidatePath('/admin/cms')
  return { success: true }
}

export async function getAllCmsPages(): Promise<CmsPage[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cms_pages')
    .select('*')
    .order('page_key', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}
