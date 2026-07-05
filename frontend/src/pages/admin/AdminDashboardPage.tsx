import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeCheck,
  BadgeDollarSign,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Filter,
  HandCoins,
  RotateCcw,
  UserRoundCheck,
  WalletCards,
  X
} from "lucide-react";
import {
  AdminPageHeader,
  DepositWithdrawChart,
  MetricCard,
  RecentDeposits,
  UserGrowthChart,
  PlatformReserveChart,
  TransactionActivityChart
} from "./admin.components";
import { useAdminOverview } from "@/hooks/useAdminQueries";
import { cn } from "@/lib/utils";

/* ─── Helpers ─── */

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatUsdt(value: number) {
  return `${new Intl.NumberFormat("en-US", { useGrouping: false }).format(Number(value.toFixed(2)))} USDT`;
}

function toDateString(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateString(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDisplayDate(value: string) {
  if (!value) return "";
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, day))
  );
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isInRange(date: Date, from: Date | null, to: Date | null) {
  if (!from || !to) return false;
  const t = date.getTime();
  return t >= Math.min(from.getTime(), to.getTime()) && t <= Math.max(from.getTime(), to.getTime());
}

/* ─── Preset Types & Data ─── */

type PresetKey = "all" | "today" | "yesterday" | "this_week" | "last_week" | "this_month" | "last_month" | "this_year" | "last_year" | "custom";

type PresetItem = { key: PresetKey; label: string; getRange: () => { fromDate: string; toDate: string } };
type PresetGroup = { label: string; items: PresetItem[] };

const PRESET_GROUPS: PresetGroup[] = [
  {
    label: "",
    items: [
      { key: "all", label: "All Time", getRange: () => ({ fromDate: "", toDate: "" }) },
      { key: "today", label: "Today", getRange: () => { const t = toDateString(new Date()); return { fromDate: t, toDate: t }; } },
      {
        key: "yesterday", label: "Yesterday",
        getRange: () => { const d = new Date(); d.setDate(d.getDate() - 1); const s = toDateString(d); return { fromDate: s, toDate: s }; },
      },
    ],
  },
  {
    label: "Current",
    items: [
      {
        key: "this_week", label: "This Week",
        getRange: () => { const n = new Date(); const dow = n.getDay(); const mon = new Date(n); mon.setDate(n.getDate() - (dow === 0 ? 6 : dow - 1)); return { fromDate: toDateString(mon), toDate: toDateString(n) }; },
      },
      {
        key: "this_month", label: "This Month",
        getRange: () => { const n = new Date(); return { fromDate: toDateString(new Date(n.getFullYear(), n.getMonth(), 1)), toDate: toDateString(n) }; },
      },
      {
        key: "this_year", label: "This Year",
        getRange: () => { const n = new Date(); return { fromDate: toDateString(new Date(n.getFullYear(), 0, 1)), toDate: toDateString(n) }; },
      },
    ],
  },
  {
    label: "Previous",
    items: [
      {
        key: "last_week", label: "Last Week",
        getRange: () => {
          const n = new Date(); const dow = n.getDay();
          const thisMon = new Date(n); thisMon.setDate(n.getDate() - (dow === 0 ? 6 : dow - 1));
          const lastMon = new Date(thisMon); lastMon.setDate(thisMon.getDate() - 7);
          const lastSun = new Date(thisMon); lastSun.setDate(thisMon.getDate() - 1);
          return { fromDate: toDateString(lastMon), toDate: toDateString(lastSun) };
        },
      },
      {
        key: "last_month", label: "Last Month",
        getRange: () => { const n = new Date(); return { fromDate: toDateString(new Date(n.getFullYear(), n.getMonth() - 1, 1)), toDate: toDateString(new Date(n.getFullYear(), n.getMonth(), 0)) }; },
      },
      {
        key: "last_year", label: "Last Year",
        getRange: () => { const n = new Date(); return { fromDate: toDateString(new Date(n.getFullYear() - 1, 0, 1)), toDate: toDateString(new Date(n.getFullYear() - 1, 11, 31)) }; },
      },
    ],
  },
];

const ALL_PRESETS = PRESET_GROUPS.flatMap((g) => g.items);

/* ─── Calendar Helpers ─── */

const WEEKDAY_HEADERS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function getMonthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(year, month, 1));
}

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  let startDow = firstDay.getDay();
  if (startDow === 0) startDow = 7;
  const days: (Date | null)[] = [];
  for (let i = 1; i < startDow; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

function getFilterLabel(activePreset: PresetKey, fromDate: string, toDate: string) {
  if (activePreset === "all" || (!fromDate && !toDate)) return "All Time";
  const preset = ALL_PRESETS.find((p) => p.key === activePreset);
  if (preset && activePreset !== "custom") return preset.label;
  if (fromDate && toDate) return `${formatDisplayDate(fromDate)} – ${formatDisplayDate(toDate)}`;
  if (fromDate) return `From ${formatDisplayDate(fromDate)}`;
  if (toDate) return `To ${formatDisplayDate(toDate)}`;
  return "Custom";
}

/* ─── Calendar Grid ─── */

function CalendarGrid({
  selectedFrom,
  selectedTo,
  onSelectDate,
}: {
  selectedFrom: string;
  selectedTo: string;
  onSelectDate: (dateStr: string) => void;
}) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const days = useMemo(() => getCalendarDays(viewYear, viewMonth), [viewYear, viewMonth]);
  const fromDate = selectedFrom ? parseDateString(selectedFrom) : null;
  const toDate = selectedTo ? parseDateString(selectedTo) : null;

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); } else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); } else setViewMonth((m) => m + 1);
  };
  const goToToday = () => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); };

  return (
    <div className="flex flex-col">
      {/* Month nav */}
      <div className="flex items-center justify-between px-1 pb-3">
        <button className="grid size-8 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800" onClick={prevMonth} type="button">
          <ChevronLeft className="size-4" />
        </button>
        <button className="text-sm font-black text-slate-900 transition-colors hover:text-cyan-700" onClick={goToToday} type="button">
          {getMonthLabel(viewYear, viewMonth)}
        </button>
        <button className="grid size-8 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800" onClick={nextMonth} type="button">
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-0">
        {WEEKDAY_HEADERS.map((wd) => (
          <div key={wd} className="pb-2 text-center text-[10px] font-black uppercase tracking-wider text-slate-400">{wd}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-0">
        {days.map((date, idx) => {
          if (!date) return <div key={`empty-${idx}`} className="h-9" />;

          const dateStr = toDateString(date);
          const isToday = isSameDay(date, today);
          const isFrom = fromDate ? isSameDay(date, fromDate) : false;
          const isTo = toDate ? isSameDay(date, toDate) : false;
          const isSelected = isFrom || isTo;
          const inRange = isInRange(date, fromDate, toDate) && !isSelected;

          return (
            <button
              key={dateStr}
              className={cn(
                "relative mx-auto flex h-9 w-full items-center justify-center text-xs font-bold transition-all duration-100",
                inRange && "bg-cyan-50",
                isFrom && toDate && "rounded-l-lg",
                isTo && fromDate && "rounded-r-lg",
                isSelected ? "bg-cyan-600 text-white" : inRange ? "text-cyan-800 hover:bg-cyan-100" : isToday ? "text-cyan-600 hover:bg-cyan-50" : "text-slate-700 hover:bg-slate-100"
              )}
              onClick={() => onSelectDate(dateStr)}
              type="button"
            >
              {date.getDate()}
              {isToday && !isSelected ? <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-cyan-500" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Dashboard Date Filter ─── */

function DashboardDateFilter({
  fromDate,
  toDate,
  activePreset,
  onApply,
}: {
  fromDate: string;
  toDate: string;
  activePreset: PresetKey;
  onApply: (range: { fromDate: string; toDate: string; preset: PresetKey }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draftFromDate, setDraftFromDate] = useState(fromDate);
  const [draftToDate, setDraftToDate] = useState(toDate);
  const [draftPreset, setDraftPreset] = useState<PresetKey>(activePreset);
  const containerRef = useRef<HTMLDivElement>(null);
  const active = Boolean(fromDate || toDate);

  useEffect(() => {
    if (!open) { setDraftFromDate(fromDate); setDraftToDate(toDate); setDraftPreset(activePreset); }
  }, [fromDate, toDate, activePreset, open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (!containerRef.current?.contains(e.target as Node)) setOpen(false); };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selectPreset = useCallback((item: PresetItem) => {
    const range = item.getRange();
    setDraftPreset(item.key);
    setDraftFromDate(range.fromDate);
    setDraftToDate(range.toDate);
  }, []);

  const handleCalendarDateSelect = useCallback((dateStr: string) => {
    setDraftPreset("custom");
    if (!draftFromDate || (draftFromDate && draftToDate)) {
      setDraftFromDate(dateStr);
      setDraftToDate("");
      return;
    }
    if (dateStr < draftFromDate) { setDraftToDate(draftFromDate); setDraftFromDate(dateStr); }
    else setDraftToDate(dateStr);
  }, [draftFromDate, draftToDate]);

  const applyFilter = () => { onApply({ fromDate: draftFromDate, toDate: draftToDate, preset: draftPreset }); setOpen(false); };
  const clearFilter = () => { setDraftFromDate(""); setDraftToDate(""); setDraftPreset("all"); onApply({ fromDate: "", toDate: "", preset: "all" }); setOpen(false); };

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger: "Filter" button with Filter icon */}
      <button
        className={cn(
          "flex h-9 items-center gap-2 rounded-xl border px-3.5 text-xs font-black shadow-sm transition-all duration-200",
          active
            ? "border-cyan-200 bg-cyan-50 text-cyan-800 shadow-cyan-100 hover:bg-cyan-100"
            : "border-slate-200 bg-white text-slate-600 hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-700"
        )}
        onClick={() => setOpen((c) => !c)}
        type="button"
      >
        <Filter className="size-3.5" />
        <span>Filter</span>
      </button>

      {open ? (
        <>
          {/* Mobile backdrop */}
          <div className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm sm:hidden" onClick={() => setOpen(false)} />

          {/* Panel: Presets (left) + Calendar (right) */}
          <div className="fixed inset-x-2 top-1/2 z-50 max-h-[85vh] w-auto -translate-y-1/2 overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-[0_24px_70px_rgba(15,23,42,0.24)] sm:absolute sm:inset-auto sm:right-0 sm:top-[calc(100%+0.5rem)] sm:z-40 sm:w-auto sm:max-w-none sm:translate-y-0 sm:shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
            <div className="flex flex-col sm:flex-row">
              {/* Left: Preset sidebar */}
              <div className="border-b border-slate-100 sm:w-[10.5rem] sm:border-b-0 sm:border-r">
                <div className="max-h-48 overflow-y-auto px-2 py-2.5 sm:max-h-none sm:py-3">
                  {PRESET_GROUPS.map((group, gi) => (
                    <div key={gi} className={cn(gi > 0 && "mt-1.5 border-t border-slate-100 pt-1.5")}>
                      {group.label ? <p className="mb-1 px-2 text-[9px] font-black uppercase tracking-widest text-slate-400">{group.label}</p> : null}
                      {group.items.map((item) => (
                        <button
                          key={item.key}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-lg px-2.5 py-[7px] text-left text-[12px] font-bold transition-all duration-100",
                            draftPreset === item.key ? "bg-cyan-50 text-cyan-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          )}
                          onClick={() => selectPreset(item)}
                          type="button"
                        >
                          {draftPreset === item.key ? (
                            <span className="grid size-4 place-items-center rounded-full bg-cyan-600 text-white"><Check className="size-2.5" /></span>
                          ) : (
                            <span className="size-4" />
                          )}
                          {item.label}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Calendar */}
              <div className="flex flex-col sm:w-[18rem]">
                <div className="px-3.5 pt-3.5 pb-2">
                  <CalendarGrid selectedFrom={draftFromDate} selectedTo={draftToDate} onSelectDate={handleCalendarDateSelect} />
                </div>

                {/* Range preview */}
                {(draftFromDate || draftToDate) ? (
                  <div className="mx-3.5 mb-2.5 rounded-lg bg-gradient-to-r from-cyan-50 to-sky-50 px-3 py-2 text-center ring-1 ring-cyan-100">
                    <p className="text-[11px] font-bold text-cyan-700">
                      {draftFromDate && draftToDate
                        ? `${formatDisplayDate(draftFromDate)}  →  ${formatDisplayDate(draftToDate)}`
                        : draftFromDate ? `From ${formatDisplayDate(draftFromDate)}` : `To ${formatDisplayDate(draftToDate)}`}
                    </p>
                  </div>
                ) : null}

                {/* Actions */}
                <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-3.5 py-2.5">
                  <button className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-black text-slate-600 shadow-sm hover:bg-slate-50" onClick={clearFilter} type="button">
                    <RotateCcw className="size-3" /> Reset
                  </button>
                  <button className="flex h-8 items-center gap-1.5 rounded-lg bg-cyan-600 px-4 text-[11px] font-black text-white shadow-sm shadow-cyan-200 hover:bg-cyan-700" onClick={applyFilter} type="button">
                    <Check className="size-3" /> Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

/* ─── Admin Dashboard Page ─── */

export function AdminDashboardPage() {
  const [filterState, setFilterState] = useState<{ fromDate: string; toDate: string; preset: PresetKey }>({
    fromDate: "", toDate: "", preset: "all",
  });

  const overviewFilter = useMemo(() => {
    if (!filterState.fromDate && !filterState.toDate) return undefined;
    return { fromDate: filterState.fromDate || undefined, toDate: filterState.toDate || undefined };
  }, [filterState.fromDate, filterState.toDate]);

  const overviewQuery = useAdminOverview(overviewFilter);
  const depositOverview = overviewQuery.data?.depositOverview;

  const handleFilterApply = useCallback((range: { fromDate: string; toDate: string; preset: PresetKey }) => {
    setFilterState(range);
  }, []);

  const metrics = [
    { title: "Total User SIGN UP", value: overviewQuery.isLoading ? "Loading..." : formatNumber(overviewQuery.data?.totalUsers ?? 0), tone: "violet", icon: UserRoundCheck },
    { title: "Total Active USERS", value: overviewQuery.isLoading ? "Loading..." : formatNumber(overviewQuery.data?.activeUsers ?? 0), tone: "emerald", icon: BadgeCheck },
    { title: "Total Top-UPS", value: overviewQuery.isLoading ? "Loading..." : formatUsdt(overviewQuery.data?.totalDepositsUsdt ?? 0), tone: "blue", icon: WalletCards },
    { title: "Total Packages Sell", value: overviewQuery.isLoading ? "Loading..." : formatUsdt(overviewQuery.data?.totalPackagesSellUsdt ?? 0), tone: "cyan", icon: CircleDollarSign },
    { title: "Total Payouts", value: overviewQuery.isLoading ? "Loading..." : formatUsdt(overviewQuery.data?.earningsPaidUsdt ?? 0), tone: "pink", icon: BadgeDollarSign },
    { title: "Total Withdrawns", value: overviewQuery.isLoading ? "Loading..." : formatUsdt(overviewQuery.data?.totalWithdrawalsUsdt ?? 0), tone: "orange", icon: HandCoins },
    { title: "Today Top-Up", value: overviewQuery.isLoading ? "Loading..." : formatUsdt(depositOverview?.todayApprovedUsdt ?? 0), tone: "amber", icon: CalendarDays },
  ];

  return (
    <section className="space-y-3 sm:space-y-4">
      <AdminPageHeader description="Quick command center for platform health, approvals, and operational visibility." title="Admin Dashboard" />

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {filterState.preset !== "all" ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-50 px-2.5 py-1 text-[11px] font-bold text-cyan-700 ring-1 ring-cyan-100">
              <CalendarDays className="size-3" />
              {getFilterLabel(filterState.preset, filterState.fromDate, filterState.toDate)}
              <button className="ml-0.5 grid size-4 place-items-center rounded-full hover:bg-cyan-100" onClick={() => setFilterState({ fromDate: "", toDate: "", preset: "all" })} type="button">
                <X className="size-2.5" />
              </button>
            </span>
          ) : (
            <span className="text-[11px] font-bold text-slate-400">Showing all-time data</span>
          )}
        </div>
        <DashboardDateFilter fromDate={filterState.fromDate} toDate={filterState.toDate} activePreset={filterState.preset} onApply={handleFilterApply} />
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4">
        {metrics.map((item) => (
          <MetricCard item={item} key={item.title} />
        ))}
      </div>

      <div className="grid gap-3 sm:gap-4 xl:grid-cols-[1.2fr_0.8fr_1fr]">
        <UserGrowthChart points={overviewQuery.data?.userGrowth} />
        <DepositWithdrawChart flow={overviewQuery.data?.depositWithdrawalFlow} />
        <RecentDeposits deposits={overviewQuery.data?.recentDeposits} />
      </div>

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2 mt-3 sm:mt-4">
        <PlatformReserveChart points={overviewQuery.data?.platformReserveHistory} />
        <TransactionActivityChart activity={overviewQuery.data?.transactionActivity} />
      </div>
    </section>
  );
}
