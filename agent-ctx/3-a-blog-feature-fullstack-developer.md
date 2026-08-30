# Task 3-a — Blog Feature (fullstack-developer)

## Task
ساخت سیستم وبلاگ کامل برای فروشگاه «سرزمین عسل»: مدل دیتابیس BlogPost، API عمومی + ادمین، پنل مدیریت وبلاگ، نمای عمومی وبلاگ (SPA views) و seed دو پست نمونه.

## Files Created
- `prisma/schema.prisma` — added `BlogPost` model (id, title, slug@unique, excerpt, content, coverImage?, tags, published, views, createdAt, updatedAt) → `bun run db:push` OK (existing data preserved)
- `prisma/seed-blog.ts` — 2 real Persian posts (honey-gon-benefits / natural-vs-fake-honey), idempotent upsert by slug, ran OK
- `src/app/api/blog/route.ts` — GET published list (curated fields, no content), force-dynamic + no-store headers (pattern from /api/products)
- `src/app/api/blog/[slug]/route.ts` — GET single published post incl. full content; increments `views` on every call
- `src/app/api/admin/blog/route.ts` — GET all posts (q search in title/slug/tags + page/limit pagination), POST create (zod; manual slug or auto from title; Persian title → `post-<uid>` fallback; uniqueSlug appends -2,-3...)
- `src/app/api/admin/blog/[id]/route.ts` — GET / PATCH / DELETE (zod; PATCH: if title changed & no explicit slug → regenerate slug from new title with Persian fallback; explicit slug gets uniqueness check)
- `src/app/admin/(panel)/blog/page.tsx` — server page, force-dynamic, getCurrentAdmin → redirect /admin/login, serializes posts → BlogManager
- `src/components/admin/BlogManager.tsx` — full admin CRUD client UI: toolbar + 4 stat tiles + search + desktop Table / mobile card list (title, published/draft Badge, formatJalaliDateTime, views), wide (max-w-4xl) create/edit Dialog with: title, slug (auto-suggested from title with uid fallback, live-cleaned kebab), excerpt Textarea + char counter, content Textarea (12 rows) with **Tabs: ویرایش / پیش‌نمایش زنده** (react-markdown + readable RTL Tailwind styles), cover image upload (FileReader.readAsDataURL, 1.5MB cap — pattern from ProductManager), tags, published Switch; quick publish/unpublish toggle per row; delete AlertDialog; sonner toasts; router.refresh after mutations
- `src/components/site/BlogView.tsx` — public blog list SPA view: honeycomb hero header, SectionHeading, skeleton loading, error state, pretty empty-state (gradient hexagon illustration), StaggerGrid cards (cover or honey-gradient placeholder + BookOpen, tag Badges, excerpt, formatJalaliDate, «ادامه مطلب»), card click → `navigate("blog", slug)`
- `src/components/site/BlogPostView.tsx` — single post SPA view: slug from `useNav((s) => s.selectedSlug)`, fetch `/api/blog/[slug]` no-store (cancellation-safe effect), skeleton / not-found state, big cover, title, meta row (date / views / tags with toPersianDigits), react-markdown body (RTL headings, lists, blockquote with `bg-honey-light/20`, code, links target=_blank), «بازگشت به وبلاگ» CTAs

## Files Edited
- `src/components/admin/AdminSidebar.tsx` — added `{ href: "/admin/blog", label: "وبلاگ", icon: Newspaper }` between محصولات and مدیریت نمایندگان (import Newspaper added)

## Navigation contract (for orchestrator)
- BlogView/BlogPostView use `const navigate = useNav((s) => s.navigate) as (view: string, slug?: string | null) => void;` — store.ts NOT touched; components compile now and keep working after ViewName gains "blog".
- BlogPostView reads `useNav((s) => s.selectedSlug)`; renders "not found" UI when slug is null.
- Exported helpers: `AdminBlogPost` (BlogManager.tsx), `BlogListItem` (BlogView.tsx), `MarkdownBody` (BlogManager.tsx).

## Notes
- Dev server had to be restarted once (killed + `bun run dev` again in background): the long-lived Next process kept the pre-BlogPost PrismaClient on globalThis, so `db.blogPost` was undefined until restart. After restart everything works.
- Telegram bot (:3003) unaffected and healthy.

## Verification
- `bun run lint` → 0 errors, 0 warnings
- `bunx tsc --noEmit` → 0 errors in all new/edited files (remaining errors are pre-existing in deploy/, examples/, mini-services/, AddToCartDialog, Header)
- curl tests: GET /api/blog → 2 posts; GET /api/blog/honey-gon-benefits → full post, views increment (1→2); GET /api/admin/blog no-auth → 401 (POST/PATCH/DELETE also 401); login (admin/admin12345) → GET /api/admin/blog → 2 posts; ?q=عسل گون → 1; POST Persian title no slug → slug `post-mtg005hchywa`; PATCH published toggle + title change → slug regenerated; DELETE → public count back to 2; /admin/blog with cookie → 200 (contains مدیریت وبلاگ/نوشتن مطلب جدید/فهرست مقالات), without → 307; sidebar «وبلاگ» item active on /admin/blog
- dev.log clean, no compile errors
