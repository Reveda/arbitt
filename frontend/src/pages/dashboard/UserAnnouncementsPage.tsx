import { useState, useEffect } from "react";
import {
  Megaphone,
  Info,
  AlertTriangle,
  AlertOctagon,
  Sparkles,
  Clock,
  Search,

} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { announcementsService, type Announcement, type AnnouncementType } from "@/services/announcements.service";
import { cn } from "@/lib/utils";

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

export function UserAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | AnnouncementType>("all");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch from backend when search value or filterType changes
  useEffect(() => {
    void loadAnnouncements(debouncedSearch, filterType);
  }, [debouncedSearch, filterType]);

  const loadAnnouncements = async (searchQuery?: string, typeQuery?: string) => {
    const list = await announcementsService.getAnnouncements(searchQuery, typeQuery);
    setAnnouncements(list);
  };

  const getTypeStyle = (t: AnnouncementType) => {
    switch (t) {
      case "info":
        return {
          icon: Info,
          bg: "bg-cyan-50 border-cyan-100 text-cyan-800",
          iconBg: "bg-cyan-150 text-cyan-700",
          border: "border-l-4 border-l-cyan-500",
          label: "Info"
        };
      case "warning":
        return {
          icon: AlertTriangle,
          bg: "bg-amber-50 border-amber-100 text-amber-800",
          iconBg: "bg-amber-150 text-amber-700",
          border: "border-l-4 border-l-amber-500",
          label: "Warning"
        };
      case "alert":
        return {
          icon: AlertOctagon,
          bg: "bg-rose-50 border-rose-100 text-rose-800",
          iconBg: "bg-rose-150 text-rose-700",
          border: "border-l-4 border-l-rose-500",
          label: "Alert"
        };
      case "update":
        return {
          icon: Sparkles,
          bg: "bg-emerald-50 border-emerald-100 text-emerald-800",
          iconBg: "bg-emerald-150 text-emerald-700",
          border: "border-l-4 border-l-emerald-500",
          label: "Update"
        };
    }
  };

  const getFilterBtnClass = (type: "all" | AnnouncementType) => {
    return cn(
      "rounded-xl px-4 py-1.5 text-xs font-black transition-all",
      filterType === type
        ? "bg-slate-900 text-white shadow-sm"
        : "bg-white text-slate-650 border border-slate-200 hover:bg-slate-50"
    );
  };

  return (
    <section className="space-y-4">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#08152e] via-[#0d5c80] to-[#22d3ee] px-4 py-4 text-white shadow-[0_18px_50px_rgba(8,21,46,0.18)] sm:px-5">
        <div className="absolute -right-10 -top-12 size-36 rounded-full bg-white/10 blur-2xl" />
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.32em] text-cyan-100/82 sm:text-xs">User Panel</p>
          <h1 className="mt-1 text-[1.35rem] font-black leading-tight tracking-tight sm:text-2xl">Platform Announcements</h1>
          <p className="mt-1 max-w-2xl text-[13px] font-semibold leading-relaxed text-cyan-50/88 sm:text-sm">
            Read official announcements, system updates, policy releases, and warnings directly from the Admin team.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="form-motion-off border-slate-200 bg-white text-slate-950 shadow-sm">
        <CardContent className="p-4 sm:p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Category Filters */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button className={getFilterBtnClass("all")} onClick={() => setFilterType("all")}>All</button>
            <button className={getFilterBtnClass("update")} onClick={() => setFilterType("update")}>Updates</button>
            <button className={getFilterBtnClass("warning")} onClick={() => setFilterType("warning")}>Warnings</button>
            <button className={getFilterBtnClass("alert")} onClick={() => setFilterType("alert")}>Alerts</button>
            <button className={getFilterBtnClass("info")} onClick={() => setFilterType("info")}>Info</button>
          </div>

          {/* Search box */}
          <div className="relative w-full sm:max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Search className="size-4" />
            </span>
            <Input
              type="text"
              placeholder="Search announcements..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 rounded-xl border-slate-200 bg-slate-50 pl-9 font-semibold text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Announcements Timeline List */}
      <div className="space-y-4">
        {announcements.length === 0 ? (
          <Card className="form-motion-off border-slate-200 bg-white text-slate-950 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Megaphone className="size-12 text-slate-350 stroke-1" />
              <h3 className="mt-4 text-sm font-black text-slate-800">No announcements found</h3>
              <p className="mt-1 text-xs font-semibold text-slate-500 max-w-sm">
                No active announcements fit your search query or selected category filter.
              </p>
            </CardContent>
          </Card>
        ) : (
          announcements.map((item) => {
            const meta = getTypeStyle(item.type);
            const IconComponent = meta.icon;
            return (
              <Card
                key={item.id}
                className={cn(
                  "form-motion-off bg-white text-slate-950 shadow-sm border border-slate-200 transition-all duration-300 hover:shadow-md",
                  meta.border
                )}
              >
                <CardContent className="p-4 sm:p-5 flex gap-4 items-start">
                  <span className={cn("grid size-10 place-items-center rounded-2xl shrink-0 shadow-sm", meta.iconBg)}>
                    <IconComponent className="size-5" />
                  </span>
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-black text-slate-950 leading-snug">{item.title}</h3>
                      <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider", meta.bg)}>
                        {meta.label}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-600 leading-relaxed whitespace-pre-line">{item.message}</p>
                    <div className="flex items-center gap-3 pt-1 text-[10px] font-bold text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {formatDateTime(item.createdAt)}
                      </span>
                      <span>·</span>
                      <span>Published by {item.createdBy}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </section>
  );
}
