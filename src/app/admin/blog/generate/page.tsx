'use client'

import { useState, useEffect, useTransition } from 'react'
import { getGenerationQueue, getTrendingTopicsForGeneration, approveGeneratedPost, rejectGeneratedPost } from '@/app/actions/blog'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface TrendingTopic { id: string; topic: string; mention_count: number; category?: string; sample_questions: { id: string; question_text: string; category: string }[] }
interface QueueItem { id: string; suggested_title: string; trending_keywords: string[]; status: string; generated_post_id: string | null; error_message: string | null; created_at: string; source_question_ids: string[] }

function generateBlogIdea(topic: TrendingTopic): { title: string; description: string } {
  const t = topic.topic.replace(/_/g, ' ')
  const titleMap: Record<string, string> = {
    contract_value: 'How to Calculate the Real Value of Your Travel Nursing Contract',
    low_rates: 'Are You Being Underpaid? How to Spot Below-Market Travel Nurse Rates',
    burnout: 'Burnout in Travel Nursing: Warning Signs and What You Can Actually Do',
    pay: 'Travel Nurse Pay Breakdown: Understanding Your Full Compensation Package',
    contract_cancellation: 'Contract Cancellations: Your Rights and How to Protect Yourself',
    contract_terms: 'Red Flags in Travel Nurse Contracts: What to Watch For Before You Sign',
    facility_issues: 'How to Research a Facility Before Accepting an Assignment',
  }
  const title = titleMap[topic.topic] || `${t.charAt(0).toUpperCase() + t.slice(1)}: What Every Travel Nurse Should Know`

  const q = topic.sample_questions[0]?.question_text
  const description = q
    ? `Based on ${topic.mention_count} community mentions. Nurses are asking: "${q.length > 80 ? q.slice(0, 77) + '...' : q}"`
    : `Trending with ${topic.mention_count} community mentions. Covers key concerns nurses have about ${t.toLowerCase()}.`

  return { title, description }
}

export default function BlogGeneratePage() {
  const router = useRouter()
  const [topics, setTopics] = useState<TrendingTopic[]>([])
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [generating, setGenerating] = useState<string | null>(null)
  const [genError, setGenError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [t, q] = await Promise.all([getTrendingTopicsForGeneration(5), getGenerationQueue()])
      setTopics(t as TrendingTopic[])
      setQueue(q as QueueItem[])
      setLoading(false)
    }
    load()
  }, [])

  async function handleGenerate(topic: TrendingTopic) {
    const idea = generateBlogIdea(topic)
    setGenerating(topic.topic)
    setGenError(null)

    try {
      const queueRes = await fetch('/api/admin/blog/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggested_title: idea.title,
          ai_prompt: topic.topic,
          source_question_ids: topic.sample_questions.map(q => q.id),
          trending_keywords: [topic.topic],
        }),
      })
      const { queueId, error: queueError } = await queueRes.json()
      if (!queueId) throw new Error(queueError || 'Failed to create queue item')

      const genRes = await fetch('/api/admin/blog/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queueId,
          topic: topic.topic,
          keywords: [topic.topic],
          suggestedTitle: idea.title,
          sampleQuestions: topic.sample_questions.map(q => q.question_text),
          sourceQuestionIds: topic.sample_questions.map(q => q.id),
        }),
      })
      const genData = await genRes.json()

      if (genData.postId) {
        router.push(`/admin/blog/${genData.postId}/edit`)
        return
      }
      if (genData.error) throw new Error(genData.error)

      // Fallback: refresh queue
      const q = await getGenerationQueue()
      setQueue(q as QueueItem[])
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(null)
    }
  }

  const pendingQueue = queue.filter(q => q.status === 'generated')

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-brand-charcoal flex items-center gap-2">
            <span className="text-brand-orange">&#10038;</span> AI Blog Generation
          </h1>
          <p className="text-brand-gray-500 text-sm mt-1">Generate posts from trending community topics</p>
        </div>
        <Link href="/admin/blog" className="text-brand-gray-400 hover:text-brand-charcoal text-sm transition-colors">&larr; All Posts</Link>
      </div>

      {genError && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl px-5 py-3 text-red-700 text-sm">
          {genError}
        </div>
      )}

      {/* Pending approval queue */}
      {pendingQueue.length > 0 && (
        <div className="mb-10">
          <h2 className="text-lg font-semibold text-brand-charcoal mb-4">
            Pending Approval
            <span className="ml-2 bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-medium">{pendingQueue.length}</span>
          </h2>
          <div className="space-y-3">
            {pendingQueue.map(item => (
              <div key={item.id} className="bg-white border border-amber-200 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-semibold text-brand-charcoal">{item.suggested_title}</p>
                    <div className="flex items-center gap-3 mt-2">
                      {item.trending_keywords.map(k => <span key={k} className="bg-brand-gray-100 text-brand-gray-500 text-xs px-2 py-0.5 rounded">{k.replace(/_/g, ' ')}</span>)}
                      <span className="text-brand-gray-400 text-xs">{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.generated_post_id && (
                      <Link href={`/admin/blog/${item.generated_post_id}/edit`} className="text-xs text-brand-gray-500 hover:text-brand-charcoal border border-brand-gray-200 px-3 py-1.5 rounded-lg transition-colors">
                        Preview & Edit
                      </Link>
                    )}
                    <button
                      onClick={() => startTransition(async () => { await rejectGeneratedPost(item.id); const q = await getGenerationQueue(); setQueue(q as QueueItem[]) })}
                      disabled={isPending}
                      className="text-xs text-red-500 hover:text-red-600 border border-red-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => item.generated_post_id && startTransition(async () => { await approveGeneratedPost(item.id, item.generated_post_id!); const q = await getGenerationQueue(); setQueue(q as QueueItem[]) })}
                      disabled={isPending || !item.generated_post_id}
                      className="text-xs text-white bg-brand-orange hover:bg-brand-orange-hover px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 font-medium"
                    >
                      Approve & Publish
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Blog post ideas from trending topics */}
      <div>
        <h2 className="text-lg font-semibold text-brand-charcoal mb-1">Blog Post Ideas</h2>
        <p className="text-brand-gray-500 text-sm mb-5">Based on what nurses are discussing most. Click to generate a full draft.</p>

        {loading ? (
          <div className="text-brand-gray-400 text-sm py-10 text-center bg-white rounded-xl border border-brand-gray-200">Loading ideas...</div>
        ) : topics.length === 0 ? (
          <div className="text-brand-gray-400 text-sm py-10 text-center bg-white rounded-xl border border-brand-gray-200">No trending topics found yet. Add Q&A data first.</div>
        ) : (
          <div className="space-y-3">
            {topics.map(topic => {
              const idea = generateBlogIdea(topic)
              const isGenerating = generating === topic.topic

              return (
                <div key={topic.id} className="bg-white border border-brand-gray-200 rounded-xl p-5 hover:border-brand-gray-300 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-brand-charcoal">{idea.title}</p>
                      <p className="text-brand-gray-500 text-sm mt-1">{idea.description}</p>
                      {topic.sample_questions.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {topic.sample_questions.slice(0, 2).map(q => (
                            <span key={q.id} className="text-xs text-brand-gray-400 bg-brand-gray-100 px-2 py-1 rounded inline-block truncate max-w-[280px]">
                              &ldquo;{q.question_text}&rdquo;
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleGenerate(topic)}
                      disabled={!!generating}
                      className="shrink-0 bg-brand-charcoal hover:bg-brand-charcoal/90 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2"
                    >
                      {isGenerating ? (
                        <>
                          <span className="animate-spin inline-block">&#10227;</span>
                          Generating...
                        </>
                      ) : (
                        <>
                          <span className="text-brand-orange">&#10038;</span>
                          Generate
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
