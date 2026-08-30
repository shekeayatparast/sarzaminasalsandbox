"use client";

// BlogManager — admin CRUD UI for the blog (Task 3-a).
//
// Receives the full post list (incl. drafts) from the admin server page.
// Renders:
//   • a search + "write new post" toolbar
//   • a post table (title, publish state, jalali date, views, actions)
//   • a wide create/edit dialog: title, slug (auto-suggested), excerpt,
//     Markdown content with a live-preview tab, cover image upload (data URL,
//     1.5MB cap), tags and a publish Switch
//   • quick publish/unpublish toggle per row
//   • a delete confirm dialog
// Toast feedback (sonner) + router.refresh() after every mutation.

import { useMemo, useState, useEffect, useRef, FormEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Newspaper,
  Plus,
  Pencil,
  Trash2,
  Save,
  AlertTriangle,
  Image as ImageIcon,
  Loader2,
  Search,
  Eye,
  EyeOff,
  X,
  BookOpen,
  CalendarDays,
  PenLine,
} from "lucide-react";
import { formatJalaliDateTime, toPersianDigits } from "@/lib/format";
import { cn } from "@/lib/utils";

// ── Types ───────────────────────────────────────────────────────────────
// Mirrors the Prisma BlogPost shape (dates → ISO strings).

export interface AdminBlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string | null;
  tags: string;
  published: boolean;
  views: number;
  createdAt: string;
  updatedAt: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────

/** Kebab-case slug from a title. Persian titles strip to "" → caller falls
 *  back to a `post-<uid>` suggestion (server does the same). */
function slugify(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Short unique-ish suggestion for Persian titles. */
function suggestSlug(): string {
  return `post-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

/** Shared Tailwind classes for a readable RTL markdown render. */
const MD_PREVIEW_CLASS = `
  prose-none max-w-none text-[15px] leading-8 text-foreground
  [&_h1]:text-2xl [&_h1]:font-extrabold [&_h1]:mt-6 [&_h1]:mb-3 [&_h1]:text-honey-dark
  [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:text-honey-dark
  [&_h3]:text-lg [&_h3]:font-bold [&_h3]:mt-4 [&_h3]:mb-2
  [&_p]:mb-4
  [&_ul]:list-disc [&_ul]:ps-6 [&_ul]:mb-4 [&_ul]:space-y-1.5
  [&_ol]:list-decimal [&_ol]:ps-6 [&_ol]:mb-4 [&_ol]:space-y-1.5
  [&_li]:leading-7
  [&_blockquote]:border-s-4 [&_blockquote]:border-honey [&_blockquote]:bg-honey-light/20
  [&_blockquote]:rounded-s-none [&_blockquote]:rounded-e-lg [&_blockquote]:px-4 [&_blockquote]:py-2 [&_blockquote]:my-4
  [&_blockquote]:text-foreground/80
  [&_strong]:font-bold
  [&_a]:text-honey-dark [&_a]:underline [&_a]:underline-offset-4
  [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[13px] [&_code]:font-mono
  [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:my-4
  [&_pre_code]:bg-transparent [&_pre_code]:p-0
  [&_hr]:border-honey/30 [&_hr]:my-6
  [&_img]:rounded-xl [&_img]:max-w-full [&_img]:h-auto [&_img]:my-4
`;

/** Simple markdown renderer — reused by the admin live preview. */
export function MarkdownBody({ content }: { content: string }) {
  return (
    <div dir="rtl">
      <ReactMarkdown
        components={{
          a: (props) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// ── Sub-component: PostFormDialog ───────────────────────────────────────
// Re-used for create and edit. When `post` is null → create mode.

interface FormState {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string | null;
  tags: string;
  published: boolean;
}

function emptyForm(): FormState {
  return {
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    coverImage: null,
    tags: "",
    published: false,
  };
}

function PostFormDialog({
  open,
  onOpenChange,
  post,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  post: AdminBlogPost | null;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [imgBusy, setImgBusy] = useState(false);
  const [imgError, setImgError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Hydrate form when dialog opens or post changes
  useEffect(() => {
    if (!open) return;
    setSlugTouched(false);
    setImgError(null);
    if (post) {
      setForm({
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt || "",
        content: post.content,
        coverImage: post.coverImage ?? null,
        tags: post.tags || "",
        published: post.published,
      });
    } else {
      setForm(emptyForm());
    }
  }, [open, post]);

  const onField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const onTitleChange = (v: string) => {
    setForm((f) => {
      // Auto-suggest an English slug: derive from the title, fall back to a
      // short uid for Persian titles.
      if (slugTouched) return { ...f, title: v };
      const base = slugify(v);
      const slug = base || (v.trim() ? suggestSlug() : "");
      return { ...f, title: v, slug };
    });
  };

  const onSlugChange = (v: string) => {
    setSlugTouched(true);
    // Strip invalid chars live so user gets instant feedback
    const cleaned = v
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-");
    onField("slug", cleaned);
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgError(null);
    setImgBusy(true);
    try {
      if (file.size > 1_500_000) {
        // ~1.5MB cap — anything bigger gets too heavy for SQLite
        setImgError(
          "حجم تصویر باید کمتر از ۱.۵ مگابایت باشد. لطفاً تصویر کوچکتری انتخاب کنید."
        );
        setImgBusy(false);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        // reader.result is a data URL — store as-is
        onField("coverImage", typeof reader.result === "string" ? reader.result : null);
        setImgBusy(false);
      };
      reader.onerror = () => {
        setImgError("خطا در خواندن فایل تصویر");
        setImgBusy(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("[PostForm image read] error:", err);
      setImgError("خطای غیرمنتظره در خواندن تصویر");
      setImgBusy(false);
    }
  };

  const clearImage = () => {
    onField("coverImage", null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setImgError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;

    // Client-side validation (mirror server Zod)
    const title = form.title.trim();
    if (title.length < 2) {
      toast.error("عنوان مقاله باید حداقل ۲ کاراکتر باشد");
      return;
    }
    const slug = form.slug.trim();
    if (!/^[a-z0-9-]+$/.test(slug) || slug.length < 2) {
      toast.error("اسلاگ نامعتبر است — فقط حروف انگلیسی کوچک، اعداد و خط تیره");
      return;
    }
    const content = form.content.trim();
    if (content.length < 10) {
      toast.error("متن مقاله کوتاه است (حداقل ۱۰ کاراکتر)");
      return;
    }
    if (form.excerpt.trim().length > 500) {
      toast.error("خلاصه مقاله نباید بیشتر از ۵۰۰ کاراکتر باشد");
      return;
    }

    const body = {
      title,
      slug,
      excerpt: form.excerpt.trim(),
      content,
      coverImage: form.coverImage,
      tags: form.tags.trim(),
      published: form.published,
    };

    setSaving(true);
    try {
      const url = post ? `/api/admin/blog/${post.id}` : "/api/admin/blog";
      const method = post ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "ذخیره ناموفق بود");
        return;
      }
      toast.success(data.message || "مقاله ذخیره شد");
      onOpenChange(false);
      // Give the dialog close animation a tick, then refresh server data
      setTimeout(() => router.refresh(), 250);
    } catch (err) {
      console.error("[PostForm submit] error:", err);
      toast.error("خطای شبکه. لطفاً دوباره تلاش کنید.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-4xl max-h-[92vh] overflow-y-auto"
        dir="rtl"
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-extrabold text-honey-dark flex items-center gap-2">
            {post ? <Pencil className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            {post ? "ویرایش مقاله" : "نوشتن مطلب جدید"}
          </DialogTitle>
          <DialogDescription className="text-right">
            {post
              ? `در حال ویرایش «${post.title}»`
              : "مقاله‌ای جدید برای وبلاگ سرزمین عسل بنویسید"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Cover image */}
          <div className="space-y-2">
            <Label className="text-sm font-bold">تصویر شاخب</Label>
            <div className="flex items-start gap-3">
              <div className="w-24 h-16 rounded-xl border-2 border-dashed border-honey/40 bg-honey-light/20 flex items-center justify-center overflow-hidden shrink-0">
                {imgBusy ? (
                  <Loader2 className="w-5 h-5 animate-spin text-honey-dark" />
                ) : form.coverImage ? (
                  <img
                    src={form.coverImage}
                    alt="پیش‌نمایش تصویر شاخب"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon className="w-5 h-5 text-honey-dark/40" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={onFileChange}
                  className="hidden"
                  id="blog-cover-input"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                    disabled={imgBusy}
                  >
                    <ImageIcon className="w-4 h-4 ml-1" />
                    انتخاب تصویر
                  </Button>
                  {form.coverImage && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearImage}
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      <X className="w-4 h-4 ml-1" />
                      حذف تصویر
                    </Button>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground leading-5">
                  تصویر انتخابی به‌صورت مستقیم در پایگاه داده ذخیره می‌شود —
                  حداکثر حجم ۱.۵ مگابایت. تصویری افقی با نسبت ۱۶:۹ بهترین
                  نمایش را دارد.
                </p>
                {imgError && (
                  <p className="text-[12px] font-bold text-red-600">{imgError}</p>
                )}
              </div>
            </div>
          </div>

          {/* Title + slug */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="blog-title" className="text-sm font-bold">
                عنوان مقاله <span className="text-red-600">*</span>
              </Label>
              <Input
                id="blog-title"
                value={form.title}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="مثلاً: خواص شگفت‌انگیز عسل گون"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="blog-slug" className="text-sm font-bold">
                اسلاگ (آدرس یکتا)
              </Label>
              <Input
                id="blog-slug"
                value={form.slug}
                onChange={(e) => onSlugChange(e.target.value)}
                placeholder="مثلاً: honey-gon-benefits"
                dir="ltr"
                className="text-left font-mono text-sm"
              />
              <p className="text-[11px] text-muted-foreground leading-5">
                فقط حروف انگلیسی کوچک، اعداد و خط تیره. اگر خالی بماند، به‌صورت
                خودکار از عنوان تولید می‌شود.
              </p>
            </div>
          </div>

          {/* Excerpt */}
          <div className="space-y-2">
            <Label htmlFor="blog-excerpt" className="text-sm font-bold">
              خلاصه کوتاه
            </Label>
            <Textarea
              id="blog-excerpt"
              value={form.excerpt}
              onChange={(e) => onField("excerpt", e.target.value)}
              placeholder="یک تا دو جمله خلاصه که در کارت لیست وبلاگ نمایش داده می‌شود..."
              rows={2}
            />
            <p className="text-[11px] text-muted-foreground">
              {toPersianDigits(form.excerpt.length)} / ۵۰۰ کاراکتر
            </p>
          </div>

          {/* Content with live preview tabs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-bold">
                متن مقاله (Markdown) <span className="text-red-600">*</span>
              </Label>
            </div>
            <Tabs defaultValue="write" dir="rtl">
              <TabsList className="mb-2">
                <TabsTrigger value="write" className="gap-1.5">
                  <PenLine className="w-3.5 h-3.5" />
                  ویرایش
                </TabsTrigger>
                <TabsTrigger value="preview" className="gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  پیش‌نمایش زنده
                </TabsTrigger>
              </TabsList>
              <TabsContent value="write" className="space-y-2">
                <Textarea
                  value={form.content}
                  onChange={(e) => onField("content", e.target.value)}
                  placeholder="متن کامل مقاله را اینجا بنویسید..."
                  rows={12}
                  className="font-mono text-sm leading-7"
                />
                <p className="text-[11px] text-muted-foreground leading-5">
                  راهنمای Markdown: سرفصل‌ها <code dir="ltr">## عنوان</code> ·
                  لیست <code dir="ltr">- مورد</code> · متن پررنگ{" "}
                  <code dir="ltr">**مهم**</code> · نقل‌قول{" "}
                  <code dir="ltr">&gt; متن</code> ·{" "}
                  <code dir="ltr">[لینک](https://...)</code>
                </p>
              </TabsContent>
              <TabsContent value="preview">
                <div className="min-h-[240px] max-h-[420px] overflow-y-auto rounded-xl border bg-card p-4">
                  {form.content.trim() ? (
                    <div className={MD_PREVIEW_CLASS}>
                      <MarkdownBody content={form.content} />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-16">
                      چیزی برای پیش‌نمایش نیست — ابتدا متن مقاله را بنویسید.
                    </p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="blog-tags" className="text-sm font-bold">
              تگ‌ها
            </Label>
            <Input
              id="blog-tags"
              value={form.tags}
              onChange={(e) => onField("tags", e.target.value)}
              placeholder="مثلاً: عسل گون,خواص عسل,درمان طبیعی"
            />
            <p className="text-[11px] text-muted-foreground">
              تگ‌ها را با کاما (، یا ,) جدا کنید.
            </p>
          </div>

          {/* Publish switch */}
          <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-4 py-3">
            <div>
              <Label htmlFor="blog-published" className="text-sm font-bold">
                انتشار مقاله
              </Label>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                اگر خاموش باشد، مقاله به‌صورت پیش‌نویس ذخیره می‌شود و در سایت
                نمایش داده نمی‌شود.
              </p>
            </div>
            <Switch
              id="blog-published"
              checked={form.published}
              onCheckedChange={(v) => onField("published", v)}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              انصراف
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-honey-gradient text-primary-foreground hover:opacity-90 shadow-md"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {post ? "ذخیره تغییرات" : "ایجاد مقاله"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Sub-component: Delete confirm dialog ───────────────────────────────
function DeleteDialog({
  post,
  open,
  onOpenChange,
  onDone,
}: {
  post: AdminBlogPost | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone?: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!post || deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/blog/${post.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "حذف ناموفق بود");
        return;
      }
      toast.success(`مقاله «${post.title}» حذف شد`);
      onOpenChange(false);
      onDone?.();
    } catch (err) {
      console.error("[BlogDeleteDialog] error:", err);
      toast.error("خطای شبکه. لطفاً دوباره تلاش کنید.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertTriangle className="w-5 h-5" />
            حذف مقاله
          </AlertDialogTitle>
          <AlertDialogDescription>
            آیا از حذف «<b>{post?.title}</b>» مطمئن هستید؟ این عملیات
            غیرقابل بازگشت است و آمار بازدید مقاله نیز از بین می‌رود.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>انصراف</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleting}
            className={cn(
              "bg-red-600 hover:bg-red-700 text-white",
              deleting && "opacity-70 cursor-wait"
            )}
          >
            {deleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            حذف مقاله
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ── Main component: BlogManager ────────────────────────────────────────
export function BlogManager({ posts }: { posts: AdminBlogPost[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminBlogPost | null>(null);
  const [deleting, setDeleting] = useState<AdminBlogPost | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return posts;
    const q = query.trim().toLowerCase();
    return posts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.tags.toLowerCase().includes(q)
    );
  }, [posts, query]);

  // Stats summary
  const stats = useMemo(() => {
    const total = posts.length;
    const published = posts.filter((p) => p.published).length;
    const drafts = total - published;
    const views = posts.reduce((s, p) => s + p.views, 0);
    return { total, published, drafts, views };
  }, [posts]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (p: AdminBlogPost) => {
    setEditing(p);
    setFormOpen(true);
  };

  const togglePublished = async (p: AdminBlogPost) => {
    if (togglingId) return;
    setTogglingId(p.id);
    try {
      const res = await fetch(`/api/admin/blog/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: !p.published }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "تغییر وضعیت ناموفق بود");
        return;
      }
      toast.success(
        p.published
          ? `«${p.title}» از حالت انتشار خارج شد (پیش‌نویس)`
          : `«${p.title}» منتشر شد`
      );
      router.refresh();
    } catch (err) {
      console.error("[togglePublished] error:", err);
      toast.error("خطای شبکه. لطفاً دوباره تلاش کنید.");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-5" dir="rtl">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-honey-dark flex items-center gap-2">
            <Newspaper className="w-6 h-6" />
            مدیریت وبلاگ
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            مجموع {toPersianDigits(stats.total)} مقاله ·{" "}
            {toPersianDigits(stats.published)} منتشرشده ·{" "}
            <span
              className={cn(
                stats.drafts > 0
                  ? "text-amber-700 font-bold"
                  : "text-muted-foreground"
              )}
            >
              {toPersianDigits(stats.drafts)} پیش‌نویس
            </span>{" "}
            · {toPersianDigits(stats.views)} بازدید
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-honey-gradient text-primary-foreground hover:opacity-90 shadow-md"
        >
          <Plus className="w-4 h-4 ml-1" />
          نوشتن مطلب جدید
        </Button>
      </div>

      {/* Quick stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile
          icon={<Newspaper className="w-5 h-5" />}
          label="کل مقالات"
          value={toPersianDigits(stats.total)}
          tint="honey"
        />
        <StatTile
          icon={<Eye className="w-5 h-5" />}
          label="منتشرشده"
          value={toPersianDigits(stats.published)}
          tint="honey"
        />
        <StatTile
          icon={<PenLine className="w-5 h-5" />}
          label="پیش‌نویس"
          value={toPersianDigits(stats.drafts)}
          tint={stats.drafts > 0 ? "warn" : "neutral"}
        />
        <StatTile
          icon={<BookOpen className="w-5 h-5" />}
          label="مجموع بازدید"
          value={toPersianDigits(stats.views)}
          tint="neutral"
        />
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="جستجو بر اساس عنوان، اسلاگ یا تگ..."
          className="pr-10"
          dir="rtl"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="پاک کردن"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Posts table */}
      <Card className="gap-0 p-0 overflow-hidden">
        <CardHeader className="p-4 border-b bg-muted/30">
          <CardTitle className="text-base flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-honey-dark" />
            فهرست مقالات
          </CardTitle>
          <CardDescription className="text-xs">
            {filtered.length === posts.length
              ? `نمایش همه ${toPersianDigits(posts.length)} مقاله`
              : `${toPersianDigits(filtered.length)} مقاله یافت شد`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Newspaper className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm">
                {posts.length === 0
                  ? "هنوز مطلبی نوشته نشده است."
                  : "مقاله‌ای با این فیلترها پیدا نشد."}
              </p>
              {posts.length === 0 && (
                <Button
                  onClick={openCreate}
                  className="bg-honey-gradient text-primary-foreground"
                >
                  <Plus className="w-4 h-4 ml-1" />
                  نوشتن اولین مطلب
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-14">تصویر</TableHead>
                      <TableHead>عنوان</TableHead>
                      <TableHead>وضعیت</TableHead>
                      <TableHead>تاریخ ایجاد</TableHead>
                      <TableHead className="text-center">بازدید</TableHead>
                      <TableHead className="text-left">عملیات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="w-12 h-9 rounded-lg overflow-hidden bg-honey-light/30 flex items-center justify-center shrink-0">
                            {p.coverImage ? (
                              <img
                                src={p.coverImage}
                                alt={p.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <BookOpen className="w-4 h-4 text-honey-dark/40" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[280px]">
                          <p className="font-bold text-foreground truncate">
                            {p.title}
                          </p>
                          <p
                            dir="ltr"
                            className="text-[11px] text-muted-foreground font-mono text-right"
                          >
                            {p.slug}
                          </p>
                        </TableCell>
                        <TableCell>
                          {p.published ? (
                            <Badge className="bg-honey-light/40 text-honey-dark border-honey/20">
                              <Eye className="w-3 h-3 ml-1" />
                              منتشرشده
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-900/20"
                            >
                              <EyeOff className="w-3 h-3 ml-1" />
                              پیش‌نویس
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="w-3.5 h-3.5 text-honey-dark/60" />
                            {formatJalaliDateTime(p.createdAt)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center font-bold">
                          {toPersianDigits(p.views)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => togglePublished(p)}
                              disabled={togglingId === p.id}
                              className={cn(
                                "h-8 w-8",
                                p.published
                                  ? "text-amber-600 hover:bg-amber-50"
                                  : "text-green-600 hover:bg-green-50"
                              )}
                              title={p.published ? "لغو انتشار" : "انتشار"}
                            >
                              {togglingId === p.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : p.published ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openEdit(p)}
                              className="h-8 w-8 text-honey-dark hover:bg-honey-light/40"
                              title="ویرایش"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setDeleting(p)}
                              className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                              title="حذف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile card list */}
              <div className="md:hidden divide-y">
                {filtered.map((p) => (
                  <div key={p.id} className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-14 h-11 rounded-lg overflow-hidden bg-honey-light/30 flex items-center justify-center shrink-0">
                        {p.coverImage ? (
                          <img
                            src={p.coverImage}
                            alt={p.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <BookOpen className="w-5 h-5 text-honey-dark/40" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground leading-6">
                          {p.title}
                        </p>
                        <p
                          dir="ltr"
                          className="text-[11px] text-muted-foreground font-mono text-right mt-0.5"
                        >
                          {p.slug}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                          {p.published ? (
                            <Badge className="bg-honey-light/40 text-honey-dark border-honey/20 text-[10px]">
                              منتشرشده
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-900/20 text-[10px]"
                            >
                              پیش‌نویس
                            </Badge>
                          )}
                          <span className="text-[11px] text-muted-foreground">
                            {formatJalaliDateTime(p.createdAt)}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {toPersianDigits(p.views)} بازدید
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => togglePublished(p)}
                        disabled={togglingId === p.id}
                        className={cn(
                          "h-9",
                          p.published
                            ? "text-amber-600 hover:bg-amber-50"
                            : "text-green-600 hover:bg-green-50"
                        )}
                      >
                        {togglingId === p.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : p.published ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                        {p.published ? "لغو انتشار" : "انتشار"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEdit(p)}
                        className="h-9 text-honey-dark hover:bg-honey-light/40"
                      >
                        <Pencil className="w-4 h-4 ml-1" />
                        ویرایش
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleting(p)}
                        className="h-9 text-red-600 hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4 ml-1" />
                        حذف
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <PostFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        post={editing}
      />
      <DeleteDialog
        post={deleting}
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        onDone={() => router.refresh()}
      />
    </div>
  );
}

// ── Small stat tile (same style as ProductManager) ─────────────────────
function StatTile({
  icon,
  label,
  value,
  tint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tint: "honey" | "warn" | "neutral";
}) {
  return (
    <Card
      className={cn(
        "flex-row items-center gap-3 p-4 border",
        tint === "honey" && "bg-honey-light/20 border-honey/20",
        tint === "warn" && "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800",
        tint === "neutral" && "bg-card"
      )}
    >
      <div
        className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
          tint === "honey"
            ? "bg-honey-gradient text-primary-foreground"
            : "bg-muted text-foreground"
        )}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground truncate">{label}</p>
        <p className="text-lg font-extrabold text-foreground">{value}</p>
      </div>
    </Card>
  );
}
