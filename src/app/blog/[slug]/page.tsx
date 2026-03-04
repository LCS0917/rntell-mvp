import { getBlogPostBySlug } from '@/app/actions/blog'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = await getBlogPostBySlug(slug)
  if (!post) return {}
  return {
    title: post.seo_title ?? post.title,
    description: post.seo_description ?? post.excerpt ?? undefined,
    openGraph: {
      title: post.seo_title ?? post.title,
      description: post.seo_description ?? post.excerpt ?? undefined,
      images: post.cover_image_url ? [post.cover_image_url] : [],
    },
  }
}

function renderMarkdown(md: string): string {
  return md
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getBlogPostBySlug(slug)
  if (!post || post.status !== 'published') notFound()

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-3xl mx-auto px-6 pt-8">
        <Link href="/blog" className="text-gray-500 hover:text-teal-400 text-sm transition-colors">← The RNTell Journal</Link>
      </div>
      {post.cover_image_url && (
        <div className="max-w-3xl mx-auto px-6 mt-6">
          <img src={post.cover_image_url} alt={post.title} className="w-full h-72 object-cover rounded-2xl" />
        </div>
      )}
      <article className="max-w-3xl mx-auto px-6 py-10">
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {post.tags.map(tag => <span key={tag} className="bg-gray-800 text-gray-400 text-xs px-3 py-1 rounded-full">{tag}</span>)}
          </div>
        )}
        <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-4">{post.title}</h1>
        <div className="flex items-center gap-4 text-gray-500 text-sm mb-8 pb-8 border-b border-gray-800">
          {post.published_at && <time>{new Date(post.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</time>}
          {post.source === 'ai_generated' && <span className="text-purple-500 text-xs">✦ AI-assisted</span>}
        </div>
        <div
          className="prose prose-invert prose-lg max-w-none prose-headings:font-bold prose-headings:text-white prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-p:text-gray-300 prose-p:leading-relaxed prose-p:mb-4 prose-li:text-gray-300 prose-strong:text-white prose-a:text-teal-400"
          dangerouslySetInnerHTML={{ __html: `<p>${renderMarkdown(post.body)}</p>` }}
        />
        <div className="mt-12 p-6 bg-teal-950/40 border border-teal-800/40 rounded-2xl text-center">
          <p className="text-white font-semibold text-lg mb-2">Know your worth. Negotiate direct.</p>
          <p className="text-gray-400 text-sm mb-5">Analyze your next offer for free — no signup required.</p>
          <div className="flex gap-3 justify-center">
            <Link href="/analyze" className="bg-teal-600 hover:bg-teal-500 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors">Analyze My Offer</Link>
            <Link href="/jobs" className="bg-gray-800 hover:bg-gray-700 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors">Browse Direct Jobs</Link>
          </div>
        </div>
      </article>
    </div>
  )
}
