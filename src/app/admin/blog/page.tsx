import { getBlogPosts } from '@/app/actions/blog'
import Link from 'next/link'
import type { BlogStatus } from '@/types/cms'

const STATUS_COLORS: Record<BlogStatus, string> = {
  draft: 'bg-brand-gray-200 text-brand-gray-500',
  pending_approval: 'bg-amber-100 text-amber-700',
  published: 'bg-emerald-100 text-emerald-700',
  archived: 'bg-brand-gray-200 text-brand-gray-400',
}
const STATUS_LABELS: Record<BlogStatus, string> = {
  draft: 'Draft', pending_approval: 'Pending Approval', published: 'Published', archived: 'Archived',
}

export default async function AdminBlogPage() {
  const posts = await getBlogPosts()
  const counts = {
    all: posts.length,
    published: posts.filter(p => p.status === 'published').length,
    pending_approval: posts.filter(p => p.status === 'pending_approval').length,
    draft: posts.filter(p => p.status === 'draft').length,
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-charcoal">Blog Posts</h1>
          <p className="text-brand-gray-500 text-sm mt-1">{counts.all} total &middot; {counts.published} published</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/blog/generate" className="bg-brand-charcoal hover:bg-brand-charcoal/90 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2">
            <span className="text-brand-orange">&#10038;</span> AI Generate
          </Link>
          <Link href="/admin/blog/new" className="bg-brand-orange hover:bg-brand-orange-hover text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors">+ New Post</Link>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total', value: counts.all, color: 'text-brand-charcoal' },
          { label: 'Published', value: counts.published, color: 'text-brand-success-dark' },
          { label: 'Pending Review', value: counts.pending_approval, color: 'text-amber-600' },
          { label: 'Drafts', value: counts.draft, color: 'text-brand-gray-500' },
        ].map(stat => (
          <div key={stat.label} className="bg-white border border-brand-gray-200 rounded-xl p-4">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-brand-gray-400 text-xs mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {counts.pending_approval > 0 && (
        <Link href="/admin/blog/generate" className="block mb-6">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-center justify-between hover:border-amber-300 transition-colors">
            <p className="text-amber-700 text-sm font-medium">{counts.pending_approval} AI-generated post{counts.pending_approval > 1 ? 's' : ''} waiting for your approval</p>
            <span className="text-amber-600 text-sm font-medium">Review &rarr;</span>
          </div>
        </Link>
      )}

      {posts.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-brand-gray-200">
          <p className="text-brand-gray-400 font-medium">No posts yet. Create one above.</p>
        </div>
      ) : (
        <div className="bg-white border border-brand-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-gray-200">
                <th className="text-left px-5 py-3 text-brand-gray-500 font-medium text-xs uppercase tracking-wider">Title</th>
                <th className="text-left px-5 py-3 text-brand-gray-500 font-medium text-xs uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 text-brand-gray-500 font-medium text-xs uppercase tracking-wider">Source</th>
                <th className="text-left px-5 py-3 text-brand-gray-500 font-medium text-xs uppercase tracking-wider">Tags</th>
                <th className="text-left px-5 py-3 text-brand-gray-500 font-medium text-xs uppercase tracking-wider">Date</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post, i) => (
                <tr key={post.id} className={`hover:bg-brand-gray-100 transition-colors ${i < posts.length - 1 ? 'border-b border-brand-gray-200' : ''}`}>
                  <td className="px-5 py-4">
                    <p className="font-medium text-brand-charcoal">{post.title}</p>
                    {post.excerpt && <p className="text-brand-gray-400 text-xs mt-0.5 line-clamp-1">{post.excerpt}</p>}
                  </td>
                  <td className="px-5 py-4"><span className={`inline-flex px-2 py-1 rounded-md text-xs font-medium ${STATUS_COLORS[post.status]}`}>{STATUS_LABELS[post.status]}</span></td>
                  <td className="px-5 py-4"><span className={`text-xs font-medium ${post.source === 'ai_generated' ? 'text-brand-orange' : 'text-brand-gray-400'}`}>{post.source === 'ai_generated' ? '&#10038; AI' : 'Manual'}</span></td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1">
                      {post.tags.slice(0, 3).map(tag => <span key={tag} className="bg-brand-gray-100 text-brand-gray-500 text-xs px-2 py-0.5 rounded">{tag}</span>)}
                      {post.tags.length > 3 && <span className="text-brand-gray-400 text-xs">+{post.tags.length - 3}</span>}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-brand-gray-400 text-xs whitespace-nowrap">{new Date(post.created_at).toLocaleDateString()}</td>
                  <td className="px-5 py-4"><Link href={`/admin/blog/${post.id}/edit`} className="text-brand-orange hover:text-brand-orange-hover text-xs font-medium">Edit</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
