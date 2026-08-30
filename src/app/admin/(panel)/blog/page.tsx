import { db } from "@/lib/db";
import { getCurrentAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BlogManager, type AdminBlogPost } from "@/components/admin/BlogManager";

export const dynamic = "force-dynamic";

// Admin page: blog management (Task 3-a).
// Server component — fetches ALL posts (including drafts, full fields) and
// passes them as plain JSON to the BlogManager client component.

export default async function AdminBlogPage() {
  const user = await getCurrentAdmin();
  if (!user) redirect("/admin/login");

  const posts = await db.blogPost.findMany({
    orderBy: { createdAt: "desc" },
  });

  // Convert Date fields to ISO strings for client serialization
  const serialized: AdminBlogPost[] = posts.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt,
    content: p.content,
    coverImage: p.coverImage,
    tags: p.tags,
    published: p.published,
    views: p.views,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));

  return <BlogManager posts={serialized} />;
}
