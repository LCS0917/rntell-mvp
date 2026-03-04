import { getBlogPosts } from '@/app/actions/blog'
import Link from 'next/link'
import type { BlogStatus } from '@/types/cms'

const STATUS_COLORS: Record<BlogStatus, string> = {
  draft: 'bg-gray-700 text-gray-300',
  pending_approval: 'bg-amber-900/60 text-amber-300',
  published: 'bg-teal-900/60 text-teal-300',
  archived: 'bg-gray-800 text-gray-500',
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
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Blog Posts</h1>
          <p className="text-gray-400 text-sm mt-1">{counts.all} total · {counts.published} published</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/blog/generate" className="bg-purple-700 hover:bg-purple-600 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"><span>✦</span> AI Generate</Link>
          <Link href="/admin/blog/new" className="bg-teal-600 hover:bg-teal-500 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors">+ New Post</Link>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {[{ label: 'Total', value: counts.all, color: 'text-white' }, { label: 'Published', value: counts.published, color: 'text-teal-400' }, { label: 'Pending Review', value: counts.pending_approval, color: 'text-amber-400' }, { label: 'Drafts', value: counts.draft, color: 'text-gray-400' }].map(stat => (
          <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-gray-500 text-xs mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {counts.pending_approval > 0 && (
        <Link href="/admin/blog/generate" className="block mb-6">
          <div className="bg-amber-950/40 border border-amber-700/40 rounded-xl px-5 py-3 flex items-center justify-between hover:border-amber-600 transition-colors">
            <p className="text-amber-300 text-sm font-medium">⚡ {counts.pending_approval} AI-generated post{counts.pending_approval > 1 ? 's' : ''} waiting for your approval</p>
            <span className="text-amber-400 text-sm">Review →</span>
          </div>
        </Link>
      )}

      {posts.length === 0 ? (
        <div className="text-center py-20 text-gray-500"><p className="text-4xl mb-4">✍️</p><p className="font-medium">No posts yet.</p></div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-800"><th className="text-left px-5 py-3 text-gray-500 font-medium">Title</th><th className="text-left px-5 py-3 text-gray-500 font-medium">Status</th><th className="text-left px-5 py-3 text-gray-500 font-medium">Source</th><th className="text-left px-5 py-3 text-gray-500 font-medium">Tags</th><th className="text-left px-5 py-3 text-gray-500 font-medium">Date</th><th className="px-5 py-3"></th></tr></thead>
            <tbody>
              {posts.map((post, i) => (
                <tr key={post.id} className={`border-b border-gray-800/60 hover:bg-gray-800/40 transition-colors ${i === posts.length - 1 ? 'border-b-0' : ''}`}>
                  <td className="px-5 py-4"><p className="font-medium text-white">{post.title}</p>{post.excerpt && <p className="text-gray-500 text-xs mt-0.5 line-clamp-1">{post.excerpt}</p>}</td>
                  <td className="px-5 py-4"><span className={`inline-flex px-2 py-1 rounded-md text-xs font-medium ${STATUS_COLORS[post.status]}`}>{STATUS_LABELS[post.status]}</span></td>
                  <td className="px-5 py-4"><span className={`text-xs ${post.source === 'ai_generated' ? 'text-purple-400' : 'text-gray-400'}`}>{post.source === 'ai_generated' ? '✦ AI' : 'Manual'}</span></td>
                  <td className="px-5 py-4"><div className="flex flex-wrap gap-1">{post.tags.slice(0, 3).map(tag => <span key={tag} className="bg-gray-800 text-gray-400 text-xs px-2 py-0.5 rounded">{tag}</span>)}{post.tags.length > 3 && <span className="text-gray-600 text-xs">+{post.tags.length - 3}</span>}</div></td>
                  <td className="px-5 py-4 text-gray-500 text-xs whitespace-nowrap">{new Date(post.created_at).toLocaleDateString()}</td>
                  <td className="px-5 py-4"><Link href={`/admin/blog/${post.id}/edit`} className="text-teal-400 hover:text-teal-300 text-xs font-medium">Edit</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
