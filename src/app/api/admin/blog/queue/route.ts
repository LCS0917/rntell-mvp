import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { requireAdmin } from '@/lib/api-guards'

export async function POST(req: NextRequest) {
  await requireAdmin()
  const supabase = await createClient()

  const { suggested_title, ai_prompt, source_question_ids, trending_keywords } = await req.json()
  const { data, error } = await supabase
    .from('blog_generation_queue')
    .insert({
      suggested_title,
      ai_prompt,
      source_question_ids: source_question_ids ?? [],
      trending_keywords: trending_keywords ?? [],
      status: 'queued'
    })
    .select('id').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ queueId: data.id })
}
