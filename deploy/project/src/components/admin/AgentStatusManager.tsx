"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Check,
  X,
  Ban,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { RejectReasonDialog } from "./RejectReasonDialog";

interface AgentStatusManagerProps {
  agent: {
    id: string;
    name: string;
    status: string;
  };
}

export function AgentStatusManager({ agent }: AgentStatusManagerProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  const callPatch = async (body: Record<string, unknown>) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/agents/${agent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "عملیات ناموفق بود");
        return false;
      }
      toast.success(data.message || "عملیات با موفقیت انجام شد");
      router.refresh();
      return true;
    } catch (err) {
      console.error("[agent status mgr] error:", err);
      toast.error("خطای شبکه. لطفاً دوباره تلاش کنید.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const approve = () => callPatch({ status: "active" });
  const block = () => callPatch({ status: "blocked" });
  const activate = () => callPatch({ status: "active" });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {agent.status === "pending" && (
        <>
          <Button
            onClick={approve}
            disabled={busy}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            تأیید نماینده
          </Button>
          <Button
            variant="destructive"
            onClick={() => setRejectOpen(true)}
            disabled={busy}
          >
            <X className="w-4 h-4" />
            رد درخواست
          </Button>
        </>
      )}

      {agent.status === "active" && (
        <Button
          variant="outline"
          onClick={block}
          disabled={busy}
          className="text-orange-700 border-orange-300 hover:bg-orange-50 dark:text-orange-300 dark:border-orange-700 dark:hover:bg-orange-900/20"
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Ban className="w-4 h-4" />
          )}
          مسدود کردن
        </Button>
      )}

      {agent.status === "blocked" && (
        <Button
          onClick={activate}
          disabled={busy}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          فعال‌سازی مجدد
        </Button>
      )}

      {agent.status === "rejected" && (
        <Button
          onClick={activate}
          disabled={busy}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          تأیید و فعال‌سازی
        </Button>
      )}

      <RejectReasonDialog
        agentId={agent.id}
        agentName={agent.name}
        open={rejectOpen}
        onOpenChange={setRejectOpen}
      />
    </div>
  );
}
