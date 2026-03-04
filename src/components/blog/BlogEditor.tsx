'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createBlogPost, updateBlogPost } from '@/app/actions/blog'
import type { BlogPost, BlogStatus } from '@/types/cms'

interface BlogEditorProps { post?: BlogPost }

export default function BlogEditor({ post }: BlogEditorProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState(post?.title ?? '')
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? '')
  const [body, setBody] = useState(post?.body ?? '')
  const [coverUrl, setCoverUrl] = useState(post?.cover_image_url ?? '')
  const [tagsInput, setTagsInput] = useState(post?.tags.join(', ') ?? '')
  const [seoTitle, setSeoTitle] = useState(post?.seo_title ?? '')
  const [seoDesc, setSeoDesc] = useState(post?.seo_description ?? '')
  const [status, setStatus] = useState<BlogStatus>(post?.status ?? 'draft')
  const [activeTab, setActiveTab] = useState<'write' | 'preview' | 'seo'>('write')

  function handleSave(targetStatus?: BlogStatus) {
    const finalStatus = targetStatus ?? status
    startTransition(async () => {
      setError(null)
      const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean)
      if (post) {
        const res = await updateBlogPost(post.id, { title, excerpt, body, cover_image_url: coverUrl || undefined, tags, seo_title: seoTitle, seo_description: seoDesc, status: finalStatus })
        if (!res.success) { setError(res.error ?? 'Save failed'); return }
      } else {
        const res = await createBlogPost({ title, excerpt, body, cover_image_url: coverUrl || undefined, tags, seo_title: seoTitle, seo_description: seoDesc, status: finalStatus })
        if (!res.success) { setError(res.error ?? 'Save failed'); return }
      }
      router.push('/admin/blog')
    })
  }

  function renderPreview(md: string) {
    return md
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-brand-charcoal mt-6 mb-2">$1</h2>')
      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold text-brand-charcoal mt-4 mb-1">$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-brand-gray-500">$1</li>')
      .replace(/\n\n/g, '</p><p class="text-brand-gray-500 mb-3">')
  }

  return (
    <div>
      {/* Top bar */}
      <div className="bg-white border-b border-brand-gray-200 -mx-6 -mt-6 px-6 py-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/admin/blog')} className="text-brand-gray-400 hover:text-brand-charcoal text-sm transition-colors">&larr; Blog</button>
          <h1 className="text-lg font-semibold text-brand-charcoal">{post ? 'Edit Post' : 'New Post'}</h1>
          {post?.source === 'ai_generated' && <span className="bg-brand-orange/10 text-brand-orange text-xs px-2 py-1 rounded font-medium">&#10038; AI Generated</span>}
        </div>
        <div className="flex items-center gap-3">
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <select value={status} onChange={e => setStatus(e.target.value as BlogStatus)} className="border border-brand-gray-200 text-brand-charcoal text-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange/30">
            <option value="draft">Draft</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
          <button onClick={() => handleSave('draft')} disabled={isPending} className="border border-brand-gray-200 hover:bg-brand-gray-100 disabled:opacity-50 text-brand-charcoal text-sm font-medium px-4 py-2 rounded-lg transition-colors">Save Draft</button>
          <button onClick={() => handleSave('published')} disabled={isPending || !title || !body} className="bg-brand-orange hover:bg-brand-orange-hover disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">{isPending ? 'Saving...' : 'Publish'}</button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Main editor */}
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Post title..."
            className="w-full bg-transparent text-2xl font-bold text-brand-charcoal placeholder-brand-gray-300 border-none outline-none mb-4"
          />
          <textarea
            value={excerpt}
            onChange={e => setExcerpt(e.target.value)}
            placeholder="Short excerpt for the blog feed card..."
            rows={2}
            className="w-full bg-white border border-brand-gray-200 rounded-lg px-4 py-3 text-brand-charcoal text-sm placeholder-brand-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange mb-6 resize-none"
          />

          {/* Tabs */}
          <div className="flex gap-1 mb-4 border-b border-brand-gray-200">
            {(['write', 'preview', 'seo'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${activeTab === tab ? 'border-brand-orange text-brand-orange' : 'border-transparent text-brand-gray-400 hover:text-brand-charcoal'}`}>{tab}</button>
            ))}
          </div>

          {activeTab === 'write' && (
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Write in Markdown..."
              className="w-full bg-white border border-brand-gray-200 rounded-xl px-5 py-4 text-brand-charcoal text-sm font-mono placeholder-brand-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange resize-none"
              style={{ minHeight: '500px' }}
            />
          )}
          {activeTab === 'preview' && (
            <div className="bg-white rounded-xl border border-brand-gray-200 p-6 text-brand-gray-500 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: `<p class="text-brand-gray-500 mb-3">${renderPreview(body)}</p>` }} />
          )}
          {activeTab === 'seo' && (
            <div className="space-y-5 bg-white rounded-xl border border-brand-gray-200 p-6">
              <div>
                <label className="block text-sm font-medium text-brand-charcoal mb-2">SEO Title <span className="text-brand-gray-400">(under 60 chars)</span></label>
                <input type="text" value={seoTitle} onChange={e => setSeoTitle(e.target.value)} maxLength={60} placeholder={title || 'SEO title...'} className="w-full border border-brand-gray-200 rounded-lg px-4 py-2.5 text-brand-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange" />
                <p className="text-brand-gray-400 text-xs mt-1">{seoTitle.length}/60</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-charcoal mb-2">Meta Description <span className="text-brand-gray-400">(under 160 chars)</span></label>
                <textarea value={seoDesc} onChange={e => setSeoDesc(e.target.value)} maxLength={160} rows={3} className="w-full border border-brand-gray-200 rounded-lg px-4 py-2.5 text-brand-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange resize-none" />
                <p className="text-brand-gray-400 text-xs mt-1">{seoDesc.length}/160</p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="w-64 shrink-0">
          <div className="bg-white rounded-xl border border-brand-gray-200 p-5 space-y-5">
            <div>
              <label className="block text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-2">Cover Image URL</label>
              <input type="url" value={coverUrl} onChange={e => setCoverUrl(e.target.value)} placeholder="https://..." className="w-full border border-brand-gray-200 rounded-lg px-3 py-2 text-brand-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange" />
              {coverUrl && <img src={coverUrl} alt="cover" className="mt-2 w-full h-32 object-cover rounded-lg" />}
            </div>
            <div>
              <label className="block text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-2">Tags</label>
              <input type="text" value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="travel nursing, pay, stipends" className="w-full border border-brand-gray-200 rounded-lg px-3 py-2 text-brand-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange" />
              <p className="text-brand-gray-400 text-xs mt-1">Comma-separated</p>
            </div>
            {post && (
              <div className="pt-4 border-t border-brand-gray-200">
                <p className="text-xs font-semibold text-brand-gray-500 uppercase tracking-wider mb-3">Info</p>
                <dl className="space-y-2 text-xs">
                  <div className="flex justify-between"><dt className="text-brand-gray-400">Created</dt><dd className="text-brand-charcoal">{new Date(post.created_at).toLocaleDateString()}</dd></div>
                  <div className="flex justify-between"><dt className="text-brand-gray-400">Source</dt><dd className={post.source === 'ai_generated' ? 'text-brand-orange' : 'text-brand-charcoal'}>{post.source === 'ai_generated' ? 'AI Generated' : 'Manual'}</dd></div>
                  {post.published_at && <div className="flex justify-between"><dt className="text-brand-gray-400">Published</dt><dd className="text-brand-charcoal">{new Date(post.published_at).toLocaleDateString()}</dd></div>}
                  <div className="flex flex-col gap-1 pt-1"><dt className="text-brand-gray-400">Slug</dt><dd className="text-brand-gray-500 font-mono break-all text-[11px]">{post.slug}</dd></div>
                </dl>
                {post.status === 'published' && (
                  <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer" className="mt-4 block text-center text-xs text-brand-orange hover:text-brand-orange-hover border border-brand-orange/30 rounded-lg py-2 transition-colors font-medium">View live post &rarr;</a>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
