import { getPublishedBlogPosts } from '@/app/actions/blog'
import { getCmsSection } from '@/app/actions/cms'
import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'The RNTell Journal — Pay Intelligence for Travel Nurses',
  description: 'Pay transparency, career strategy, and the truth about travel nursing.',
}

export default async function BlogFeedPage() {
  const [posts, hero] = await Promise.all([getPublishedBlogPosts(), getCmsSection('blog', 'hero')])
  const headline = (hero?.content as Record<string, string>)?.headline ?? 'The RNTell Journal'
  const subheadline = (hero?.content as Record<string, string>)?.subheadline ?? 'Pay intelligence and career strategy for travel nurses.'
  const featured = posts[0]
  const rest = posts.slice(1)

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <section className="border-b border-gray-800 px-6 py-16 text-center">
        <div className="max-w-2xl mx-auto">
          <p className="text-teal-400 text-xs font-semibold uppercase tracking-widest mb-4">RNTell Journal</p>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">{headline}</h1>
          <p className="text-gray-400 text-lg">{subheadline}</p>
        </div>
      </section>
      <div className="max-w-5xl mx-auto px-6 py-12">
        {posts.length === 0 ? (
          <div className="text-center py-20 text-gray-500"><p className="text-lg">No posts yet. Check back soon.</p></div>
        ) : (
          <>
            {featured && (
              <Link href={`/blog/${featured.slug}`} className="block mb-12 group">
                <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-teal-700/50 transition-all">
                  {featured.cover_image_url && <div className="relative h-64"><Image src={featured.cover_image_url} alt={featured.title} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 1024px" /></div>}
                  <div className="p-8">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="bg-teal-900/60 text-teal-300 text-xs font-semibold px-3 py-1 rounded-full">Featured</span>
                      {featured.tags.slice(0, 2).map(tag => <span key={tag} className="text-gray-500 text-xs">{tag}</span>)}
                    </div>
                    <h2 className="text-2xl font-bold text-white group-hover:text-teal-300 transition-colors mb-3">{featured.title}</h2>
                    {featured.excerpt && <p className="text-gray-400 leading-relaxed">{featured.excerpt}</p>}
                    <p className="text-gray-600 text-sm mt-4">{featured.published_at ? new Date(featured.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}</p>
                  </div>
                </div>
              </Link>
            )}
            {rest.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {rest.map(post => (
                  <Link key={post.id} href={`/blog/${post.slug}`} className="group block">
                    <article className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-teal-700/40 transition-all h-full flex flex-col">
                      {post.cover_image_url && <div className="relative h-44"><Image src={post.cover_image_url} alt={post.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" /></div>}
                      <div className="p-6 flex flex-col flex-1">
                        {post.tags.length > 0 && <div className="flex flex-wrap gap-1.5 mb-3">{post.tags.slice(0, 2).map(tag => <span key={tag} className="bg-gray-800 text-gray-400 text-xs px-2 py-0.5 rounded">{tag}</span>)}</div>}
                        <h2 className="text-lg font-bold text-white group-hover:text-teal-300 transition-colors mb-2">{post.title}</h2>
                        {post.excerpt && <p className="text-gray-400 text-sm line-clamp-3 flex-1">{post.excerpt}</p>}
                        <p className="text-gray-600 text-xs mt-4">{post.published_at ? new Date(post.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</p>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
