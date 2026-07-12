import { useState, useEffect } from "react";
import { 
  Megaphone, 
  Plus, 
  Trash2, 
  Info, 
  AlertTriangle, 
  AlertOctagon, 
  Sparkles, 
  Clock, 
  X,
  PlusCircle,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { announcementsService, type Announcement, type AnnouncementType } from "@/services/announcements.service";
import { cn } from "@/lib/utils";

const modalOverlayClass =
  "fixed inset-0 z-50 flex items-end justify-center overflow-hidden bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4";
const modalPanelClass =
  "flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-b-none rounded-t-2xl border-slate-200 bg-white text-slate-950 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl";
const modalHeaderClass =
  "flex shrink-0 flex-row items-start justify-between gap-3 border-b border-slate-100 p-4 sm:p-5";
const modalBodyClass = "min-h-0 flex-1 overflow-y-auto p-4 sm:p-5";
const modalFooterClass =
  "shrink-0 border-t border-slate-100 bg-slate-50 p-4 sm:p-5 flex justify-end gap-2.5";

function formatDateTime(isoString: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  }).format(new Date(isoString));
}

export function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form fields
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<AnnouncementType>("info");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    const list = await announcementsService.getAnnouncements();
    setAnnouncements(list);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    await announcementsService.createAnnouncement(title.trim(), message.trim(), type);
    setTitle("");
    setMessage("");
    setType("info");
    setError(null);
    setIsModalOpen(false);
    await loadAnnouncements();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this announcement?")) {
      await announcementsService.deleteAnnouncement(id);
      await loadAnnouncements();
    }
  };

  const getTypeStyle = (t: AnnouncementType) => {
    switch (t) {
      case "info":
        return {
          icon: Info,
          bg: "bg-cyan-50 border-cyan-200 text-cyan-800",
          iconBg: "bg-cyan-100 text-cyan-700",
          label: "Info"
        };
      case "warning":
        return {
          icon: AlertTriangle,
          bg: "bg-amber-50 border-amber-200 text-amber-800",
          iconBg: "bg-amber-100 text-amber-700",
          label: "Warning"
        };
      case "alert":
        return {
          icon: AlertOctagon,
          bg: "bg-rose-50 border-rose-200 text-rose-800",
          iconBg: "bg-rose-100 text-rose-700",
          label: "Alert"
        };
      case "update":
        return {
          icon: Sparkles,
          bg: "bg-emerald-50 border-emerald-200 text-emerald-800",
          iconBg: "bg-emerald-100 text-emerald-700",
          label: "Update"
        };
    }
  };

  return (
    <section className="space-y-4">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#08152e] via-[#0f4d7a] to-[#2563eb] px-4 py-4 text-white shadow-lg sm:px-5">
        <div className="absolute -right-10 -top-12 size-36 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.32em] text-blue-100/80 sm:text-xs">Management Console</p>
            <h1 className="mt-1 text-[1.35rem] font-black leading-tight tracking-tight sm:text-2xl">Broadcast Announcements</h1>
            <p className="mt-1 max-w-2xl text-[13px] font-semibold leading-relaxed text-blue-50/80 sm:text-sm">
              Publish news, security warnings, ROI yield updates, or alerts to all platform users.
            </p>
          </div>
          <Button
            className="h-11 rounded-xl bg-white text-blue-900 shadow-sm hover:bg-blue-50 font-bold px-5 shrink-0 transition-transform active:scale-95"
            onClick={() => setIsModalOpen(true)}
            type="button"
          >
            <Plus className="size-4 mr-1.5" />
            New Broadcast
          </Button>
        </div>
      </div>

      {/* Main List */}
      <Card className="form-motion-off border-slate-200 bg-white text-slate-950 shadow-sm">
        <CardHeader className="border-b border-slate-100 p-4 sm:p-5 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-black tracking-tight">Active Broadcast Timeline</CardTitle>
            <CardDescription className="text-xs font-semibold text-slate-500">
              Total {announcements.length} announcement{announcements.length === 1 ? "" : "s"} visible to users
            </CardDescription>
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
            <Clock className="size-3" /> Live Feed
          </span>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 space-y-4">
          {announcements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Megaphone className="size-12 text-slate-350 stroke-1" />
              <h3 className="mt-4 text-sm font-black text-slate-800">No active announcements</h3>
              <p className="mt-1 text-xs font-semibold text-slate-500 max-w-sm">
                Click the 'New Broadcast' button above to send your first message to users.
              </p>
            </div>
          ) : (
            <div className="relative border-l-2 border-slate-100 pl-4 ml-2 space-y-6">
              {announcements.map((item) => {
                const meta = getTypeStyle(item.type);
                const IconComponent = meta.icon;
                return (
                  <div key={item.id} className="relative group">
                    {/* Circle timeline bullet */}
                    <div className={cn(
                      "absolute -left-[25px] top-1.5 size-4 rounded-full border-2 border-white ring-4 ring-white flex items-center justify-center shadow-sm",
                      meta.bg.split(" ")[0]
                    )} />

                    <div className="flex items-start justify-between gap-4 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 hover:border-slate-200/80 rounded-2xl p-4 transition-all duration-300">
                      <div className="flex gap-3.5 items-start">
                        <span className={cn("grid size-9 place-items-center rounded-xl shrink-0 mt-0.5 shadow-sm", meta.iconBg)}>
                          <IconComponent className="size-4.5" />
                        </span>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm font-black text-slate-900 leading-snug">{item.title}</h4>
                            <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider", meta.bg)}>
                              {meta.label}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-slate-650 leading-relaxed max-w-3xl whitespace-pre-line">{item.message}</p>
                          <div className="flex items-center gap-3 pt-1.5 text-[10px] font-bold text-slate-400">
                            <span className="flex items-center gap-1">
                              <Clock className="size-3" />
                              {formatDateTime(item.createdAt)}
                            </span>
                            <span>·</span>
                            <span>By {item.createdBy}</span>
                          </div>
                        </div>
                      </div>

                      <Button
                        className="size-8 rounded-lg p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border-0 shadow-none shrink-0"
                        onClick={() => handleDelete(item.id)}
                        type="button"
                        variant="ghost"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Modal */}
      {isModalOpen && (
        <div className={modalOverlayClass}>
          <div className={modalPanelClass}>
            <form onSubmit={handleCreate} className="flex min-h-full flex-col">
              <div className={modalHeaderClass}>
                <div>
                  <h3 className="text-base font-black tracking-tight text-slate-900">Publish New Broadcast</h3>
                  <p className="text-[11px] font-semibold text-slate-400">This announcement will be instantly broadcast to all users</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="-mr-1.5 size-7 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-900"
                  onClick={() => setIsModalOpen(false)}
                >
                  <X className="size-4" />
                </Button>
              </div>

              <div className={modalBodyClass + " space-y-4"}>
                {error && (
                  <div className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700">
                    {error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Announcement Title</label>
                  <Input
                    placeholder="e.g., ROI rates updated"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="border-slate-200 bg-slate-50 focus-visible:ring-blue-500 font-bold text-slate-900"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Broadcast Message</label>
                  <textarea
                    rows={4}
                    placeholder="Write detailed announcements here..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="flex w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 font-semibold text-slate-900 leading-relaxed"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Severity/Type</label>
                  <select
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-black text-slate-800 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    value={type}
                    onChange={(e) => setType(e.target.value as AnnouncementType)}
                  >
                    <option value="info">Info (Blue)</option>
                    <option value="update">Update (Green)</option>
                    <option value="warning">Warning (Amber)</option>
                    <option value="alert">Alert (Red)</option>
                  </select>
                </div>
              </div>

              <div className={modalFooterClass}>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl border-slate-200 font-bold hover:bg-slate-50 text-xs px-4"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="rounded-xl bg-blue-700 font-bold text-white hover:bg-blue-800 text-xs px-5 gap-1.5 shadow-md shadow-blue-700/10"
                >
                  <PlusCircle className="size-4" />
                  Publish Broadcast
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
