import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { requireAdmin } from '@/lib/api-guards'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(req: NextRequest) {
  const { user } = await requireAdmin()
  const supabase = await createClient()

  const body = await req.json()
  const { queueId, topic, keywords, sampleQuestions, suggestedTitle } = body
  if (!queueId || !topic) return NextResponse.json({ error: 'Missing queueId or topic' }, { status: 400 })

  await supabase.from('blog_generation_queue').update({ status: 'generating' }).eq('id', queueId)

  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error('GEMINI_API_KEY is not configured')
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const questionsContext = sampleQuestions?.length
      ? `\n\nRelated questions travel nurses are asking:\n${sampleQuestions.map((q: string) => `- ${q}`).join('\n')}`
      : ''

    const prompt = `You are a sharp, knowledgeable writer for RNTell — a nurse-first, recruiterless marketplace for travel and contract nurses. RNTell's brand voice is: direct, empowering, data-driven, and anti-agency. Never promotional. Always on the nurse's side.

Write a high-quality blog post on the following topic for travel nurses:

Topic: ${topic}
Keywords to naturally incorporate: ${keywords?.join(', ') || topic}
${suggestedTitle ? `Suggested title: ${suggestedTitle}` : ''}
${questionsContext}

Requirements:
- Title: Compelling, specific, SEO-friendly. Not clickbait.
- Length: 800-1200 words
- Format: Markdown. Use ## for section headers, **bold** for key terms, bullet lists where appropriate.
- Tone: Conversational but authoritative. Written for working nurses, not executives.
- Include practical, actionable takeaways nurses can use immediately.
- Reference GSA benchmarks, margin transparency, or direct-hire advantages where relevant.
- Do NOT mention specific agency names or make legal claims.
- End with a subtle call to action pointing nurses toward RNTell's tools.

Respond with a JSON object in this exact shape (no markdown fences):
{
  "title": "string",
  "excerpt": "string (2-3 sentence summary)",
  "body": "string (full markdown body)",
  "tags": ["string", "string"],
  "seo_title": "string (under 60 chars)",
  "seo_description": "string (under 160 chars)"
}`

    const result = await model.generateContent(prompt)
    const text = result.response.text()

    let parsed: { title: string; excerpt: string; body: string; tags: string[]; seo_title: string; seo_description: string }
    try {
      parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
    } catch {
      throw new Error('Gemini returned invalid JSON: ' + text.slice(0, 200))
    }

    const slug = parsed.title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim() + '-' + Date.now().toString(36)

    const { data: post, error: postError } = await supabase
      .from('blog_posts')
      .insert({
        title: parsed.title, slug, excerpt: parsed.excerpt, body: parsed.body,
        tags: parsed.tags ?? [], seo_title: parsed.seo_title, seo_description: parsed.seo_description,
        status: 'pending_approval', source: 'ai_generated',
        ai_prompt_context: topic, source_question_ids: body.sourceQuestionIds ?? [],
        created_by: user.id,
      })
      .select('id').single()

    if (postError) throw new Error(postError.message)

    await supabase.from('blog_generation_queue').update({ status: 'generated', generated_post_id: post.id }).eq('id', queueId)
    return NextResponse.json({ success: true, postId: post.id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    await supabase.from('blog_generation_queue').update({ status: 'queued', error_message: message }).eq('id', queueId)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
