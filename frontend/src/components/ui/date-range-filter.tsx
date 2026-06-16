import { useEffect, useRef, useState } from "react";
import { CalendarDays, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type DateRangeFilterProps = {
  fromDate: string;
  toDate: string;
  onApply: (range: { fromDate: string; toDate: string }) => void;
  className?: string;
};

function formatDisplayDate(value: string) {
  if (!value) {
    return "";
  }

  const [year, month, day] = value.split("-").map(Number);

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function getButtonLabel(fromDate: string, toDate: string) {
  if (fromDate && toDate) {
    return `${formatDisplayDate(fromDate)} - ${formatDisplayDate(toDate)}`;
  }

  if (fromDate) {
    return `From ${formatDisplayDate(fromDate)}`;
  }

  if (toDate) {
    return `To ${formatDisplayDate(toDate)}`;
  }

  return "Date";
}

export function DateRangeFilter({ fromDate, toDate, onApply, className }: DateRangeFilterProps) {
  const [open, setOpen] = useState(false);
  const [draftFromDate, setDraftFromDate] = useState(fromDate);
  const [draftToDate, setDraftToDate] = useState(toDate);
  const containerRef = useRef<HTMLDivElement>(null);
  const active = Boolean(fromDate || toDate);

  useEffect(() => {
    if (!open) {
      setDraftFromDate(fromDate);
      setDraftToDate(toDate);
    }
  }, [fromDate, open, toDate]);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", closeOnOutsideClick);
    }

    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [open]);

  const applyRange = () => {
    onApply({ fromDate: draftFromDate, toDate: draftToDate });
    setOpen(false);
  };

  const clearRange = () => {
    setDraftFromDate("");
    setDraftToDate("");
    onApply({ fromDate: "", toDate: "" });
    setOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <Button
        aria-expanded={open}
        className={cn(
          "h-10 rounded-xl border-slate-200 bg-white px-3 text-xs font-black text-slate-700 shadow-sm hover:bg-cyan-50",
          active && "border-cyan-200 bg-cyan-50 text-cyan-800 shadow-cyan-100",
          className
        )}
        onClick={() => setOpen((current) => !current)}
        type="button"
        variant="outline"
      >
        <span className={cn("grid size-6 place-items-center rounded-lg bg-slate-50 text-slate-500", active && "bg-white text-cyan-700")}>
          <CalendarDays className="size-3.5" />
        </span>
        <span className="max-w-48 truncate">
          {getButtonLabel(fromDate, toDate)}
        </span>
      </Button>

      {open ? (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm sm:hidden"
            onClick={() => setOpen(false)}
          />
          {/* Filter Container */}
          <div className="fixed inset-x-4 top-1/2 z-50 w-auto max-w-sm -translate-y-1/2 overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-[0_24px_70px_rgba(15,23,42,0.24)] sm:absolute sm:inset-auto sm:right-0 sm:top-[calc(100%+0.65rem)] sm:translate-y-0 sm:w-[26rem] sm:max-w-none sm:z-40 sm:shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-white to-cyan-50/55 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100">
                  <CalendarDays className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-black text-slate-950">Date Filter</p>
                  <p className="mt-0.5 text-[11px] font-bold text-slate-400">
                    {active ? getButtonLabel(fromDate, toDate) : "All records"}
                  </p>
                </div>
              </div>
              <button
                className="grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50"
                onClick={() => setOpen(false)}
                type="button"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="grid gap-3 px-4 py-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-black text-slate-500">From Date</span>
                <Input
                  className="h-11 rounded-xl border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-900 [color-scheme:light]"
                  max={draftToDate || undefined}
                  onChange={(event) => setDraftFromDate(event.target.value)}
                  type="date"
                  value={draftFromDate}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-black text-slate-500">To Date</span>
                <Input
                  className="h-11 rounded-xl border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-900 [color-scheme:light]"
                  min={draftFromDate || undefined}
                  onChange={(event) => setDraftToDate(event.target.value)}
                  type="date"
                  value={draftToDate}
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-3">
              <Button className="h-10 rounded-xl bg-white px-5" onClick={clearRange} type="button" variant="outline">
                Clear
              </Button>
              <Button className="h-10 rounded-xl bg-cyan-600 px-5 text-white shadow-sm shadow-cyan-200 hover:bg-cyan-700" onClick={applyRange} type="button">
                <Check className="size-4" />
                Apply
              </Button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
