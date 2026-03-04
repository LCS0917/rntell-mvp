'use client'

import { useState, useEffect, useTransition } from 'react'
import { getGenerationQueue, getTrendingTopicsForGeneration, approveGeneratedPost, rejectGeneratedPost } from '@/app/actions/blog'
import Link from 'next/link'

interface TrendingTopic { id: string; topic: string; mention_count: number; category?: string; sample_questions: { id: string; question_text: string; category: string }[] }
interface QueueItem { id: string; suggested_title: string; trending_keywords: string[]; status: string; generated_post_id: string | null; error_message: string | null; created_at: string; source_question_ids: string[] }

export default function BlogGeneratePage() {
  const [topics, setTopics] = useState<TrendingTopic[]>([])
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [selected, setSelected] = useState<TrendingTopic | null>(null)
  const [customTitle, setCustomTitle] = useState('')
  const [generating, setGenerating] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [t, q] = await Promise.all([getTrendingTopicsForGeneration(25), getGenerationQueue()])
      setTopics(t as TrendingTopic[])
      setQueue(q as QueueItem[])
      setLoading(false)
    }
    load()
  }, [])

  async function handleGenerate(topic: TrendingTopic) {
    setGenerating(topic.topic)
    const res = await fetch('/api/admin/blog/queue', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ suggested_title: customTitle || `${topic.topic}: What Every Travel Nurse Needs to Know`, ai_prompt: topic.topic, source_question_ids: topic.sample_questions.map(q => q.id), trending_keywords: [topic.topic] }) })
    const { queueId } = await res.json()
    await fetch('/api/admin/blog/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ queueId, topic: topic.topic, keywords: [topic.topic], suggestedTitle: customTitle || undefined, sampleQuestions: topic.sample_questions.map(q => q.question_text), sourceQuestionIds: topic.sample_questions.map(q => q.id) }) })
    setGenerating(null); setCustomTitle(''); setSelected(null)
    const q = await getGenerationQueue(); setQueue(q as QueueItem[])
  }

  const pendingQueue = queue.filter(q => q.status === 'generated')

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><span className="text-purple-400">✦</span> AI Blog Generation</h1>
          <p className="text-gray-400 text-sm mt-1">Generate posts from trending topics in your Q&A knowledge base</p>
        </div>
        <Link href="/admin/blog" className="text-gray-500 hover:text-white text-sm transition-colors">← All Posts</Link>
      </div>

      {pendingQueue.length > 0 && (
        <div className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4">Pending Approval <span className="ml-2 bg-amber-900/60 text-amber-300 text-xs px-2 py-0.5 rounded-full font-medium">{pendingQueue.length}</span></h2>
          <div className="space-y-4">
            {pendingQueue.map(item => (
              <div key={item.id} className="bg-gray-900 border border-amber-700/30 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-semibold text-white">{item.suggested_title}</p>
                    <div className="flex items-center gap-3 mt-2">
                      {item.trending_keywords.map(k => <span key={k} className="bg-purple-900/40 text-purple-300 text-xs px-2 py-0.5 rounded">{k}</span>)}
                      <span className="text-gray-600 text-xs">{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.generated_post_id && <Link href={`/admin/blog/${item.generated_post_id}/edit`} className="text-xs text-gray-400 hover:text-white border border-gray-700 px-3 py-1.5 rounded-lg transition-colors">Preview & Edit</Link>}
                    <button onClick={() => startTransition(async () => { await rejectGeneratedPost(item.id); const q = await getGenerationQueue(); setQueue(q as QueueItem[]) })} disabled={isPending} className="text-xs text-red-400 hover:text-red-300 border border-red-900/40 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">Reject</button>
                    <button onClick={() => item.generated_post_id && startTransition(async () => { await approveGeneratedPost(item.id, item.generated_post_id!); const q = await getGenerationQueue(); setQueue(q as QueueItem[]) })} disabled={isPending || !item.generated_post_id} className="text-xs text-white bg-teal-600 hover:bg-teal-500 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 font-medium">Approve & Publish</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold text-white mb-2">Trending Topics</h2>
        <p className="text-gray-500 text-sm mb-5">Sourced from your Q&A knowledge base — sorted by mention frequency</p>
        {loading ? <div className="text-gray-500 text-sm py-10 text-center">Loading trending topics…</div> : topics.length === 0 ? <div className="text-gray-500 text-sm py-10 text-center">No trending topics found yet.</div> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {topics.map(topic => (
              <div key={topic.id} className={`bg-gray-900 border rounded-xl p-5 transition-all cursor-pointer ${selected?.id === topic.id ? 'border-purple-500 bg-purple-950/20' : 'border-gray-800 hover:border-gray-600'}`} onClick={() => setSelected(selected?.id === topic.id ? null : topic)}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-white capitalize">{topic.topic}</p>
                    {topic.category && <span className="text-xs text-gray-500 mt-0.5 block">{topic.category}</span>}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-purple-400 text-xs font-medium">{topic.mention_count} mentions</span>
                      {topic.sample_questions.length > 0 && <span className="text-gray-600 text-xs">· {topic.sample_questions.length} related questions</span>}
                    </div>
                  </div>
                  <span className="text-gray-600 text-lg ml-2">{selected?.id === topic.id ? '▲' : '▼'}</span>
                </div>
                {selected?.id === topic.id && (
                  <div className="mt-4 pt-4 border-t border-gray-800">
                    {topic.sample_questions.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Questions nurses are asking</p>
                        <ul className="space-y-1.5">{topic.sample_questions.map(q => <li key={q.id} className="text-xs text-gray-300 flex gap-2"><span className="text-purple-500 shrink-0">›</span>{q.question_text}</li>)}</ul>
                      </div>
                    )}
                    <input type="text" value={customTitle} onChange={e => setCustomTitle(e.target.value)} placeholder={`${topic.topic}: What Every Travel Nurse Needs to Know`} onClick={e => e.stopPropagation()} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 text-sm focus:outline-none focus:border-purple-500 mb-3" />
                    <button onClick={(e) => { e.stopPropagation(); handleGenerate(topic) }} disabled={generating === topic.topic} className="w-full bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2">
                      {generating === topic.topic ? <><span className="animate-spin">⟳</span>Generating with Gemini…</> : <><span>✦</span>Generate Post</>}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
