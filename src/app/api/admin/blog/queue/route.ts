import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.user_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
