# Task 3-b — Commission Removal (fullstack-developer)

Removed the entire «پورسانت» (commission) section from the admin panel and agent panel: every display, form, table column, stat card, CSV column, PDF row, and API surface. **schema.prisma untouched** (left for task 3-a — no db:push, no conflict). DB field `commissionRate @default(10)` stays but is never selected or shown.

## Files Edited (16)

### Admin panel
| File | Change |
|---|---|
| `src/app/admin/(panel)/page.tsx` | StatCard «پورسانت پرداختی» → «میانگین هر سفارش» (guarded div, Receipt icon); commission column removed from ActiveAgentsList (+select); `totalCommissionPaid` removed from fallback (also completed pre-existing incomplete fallback → fixed TS2740) |
| `src/app/admin/(panel)/agents/page.tsx` | Desktop table column + mobile card block + select cleaned; unused Badge import removed |
| `src/app/admin/(panel)/agents/[id]/page.tsx` | MiniStat → «میانگین ارزش سفارش»; 2 FinancialRows removed; «تراکنش اخیر (پورسانت/پرداخت)» → «تراکنش اخیر»; payments type map: commission key removed, fallback changed to «تراکنش» (old commission rows still render something readable); commissionRate prop removed from AgentStatusManager; PercentIcon deleted |
| `src/components/admin/AgentStatusManager.tsx` | «ویرایش پورسانت» button + commission Dialog (Slider/Input) + states + submitCommission fully removed; callPatch now status-only |
| `src/components/admin/DownloadAgentsCsvButton.tsx` | CSV column «نرخ پورسانت» removed (header + value + interface) |
| `src/app/admin/(panel)/reports/page.tsx` | 4th card → «سهم فروش نماینده‌ها» (agentRevenue + % of total, guarded) |
| `src/lib/pdf/reports-pdf.ts` | PDF summary card → «میانگین هر سفارش» (2x2 grid preserved) |

### Admin API
| File | Change |
|---|---|
| `src/app/api/admin/agents/[id]/route.ts` | commissionRate removed from zod schema + update logic + response select → admins **cannot set commission via API anymore** (verified: PATCH with commissionRate = no-op) |
| `src/app/api/admin/agents/route.ts` | commissionRate removed from select |

### Agent panel
| File | Change |
|---|---|
| `src/app/agent/(panel)/page.tsx` | StatCard → «فروش کل» (Coins); Info «نرخ پورسانت» → «عضویت از» (Jalali createdAt); 4-grid kept |
| `src/app/agent/(panel)/profile/page.tsx` | select cleaned |
| `src/components/agent/ProfileForm.tsx` | «نرخ پورسانت» → «موجودی حساب»; interface cleaned |
| `src/app/api/agent/me/route.ts` | select cleaned |
| `src/app/api/agent/profile/route.ts` | select cleaned (GET + PATCH) |
| `src/app/api/auth/agent/login/route.ts` | commissionRate removed from JSON response |
| `src/app/api/auth/agent/register/route.ts` | `commissionRate: 10` removed from create data — safe, schema has `@default(10)` |

### Stats lib
| File | Change |
|---|---|
| `src/lib/stats.ts` | AgentStats: `totalCommission`/`commissionRate` removed (interface + calc + return + select). AdminStats: `totalCommissionPaid` removed (interface + reduce + return); commissionRate removed from agents select |

## Checks (all green)
- `bun run lint` → **0 errors, 0 warnings**
- `bunx tsc --noEmit` → no errors in any edited file (remaining errors are pre-existing in untouched files: pdf route Uint8Array lib quirk, site components — 3-c scope)
- `rg -i "commission|پورسانت" src mini-services` → **empty** (only schema.prisma intentionally kept)
- Runtime (real admin+agent sessions): `/admin`, `/admin/agents`, `/admin/reports`, `/admin/agents/[id]`, `/agent`, `/agent/profile` all **200**; unauth → 307; `/api/admin/reports/pdf` → 200 valid PDF
- Rendered HTML of all pages contains 0 «پورسانت»; new cards confirmed in HTML
- Telegram bot (:3003) had zero commission references — untouched, health 200

## Notes for Future Agents
- Old `commission`-type AgentPayment rows still exist in DB; the payments table now labels unknown/legacy types as «تراکنش».
- Task 3-a owns schema.prisma; when it drops `commissionRate`, nothing in src references it anymore (grep verified), so its migration is UI-safe.
- Test agent credentials: phone `09123456789` / password `test1234`; admin `admin`/`admin12345`.
