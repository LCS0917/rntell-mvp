import { getBlogPostById } from '@/app/actions/blog'
import BlogEditor from '@/components/blog/BlogEditor'
import { notFound } from 'next/navigation'

export default async function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const post = await getBlogPostById(id)
  if (!post) notFound()
  return <BlogEditor post={post} />
}
