import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import arbitrumIcon from "@/assets/arbitrum-mark-hex.png";

export type PublicNavItem = {
  id: string;
  label: string;
};

export type PublicAuthNavState =
  | { status: "checking" }
  | { status: "guest" }
  | { dashboardPath: string; status: "authenticated" };

type PublicNavbarProps = {
  authState: PublicAuthNavState;
  mobileOpen: boolean;
  navItems: PublicNavItem[];
  onCloseMobile: () => void;
  onNavClick: (sectionId: string) => void;
  onToggleMobile: () => void;
};

export function PublicNavbar({ authState, mobileOpen, navItems, onCloseMobile, onNavClick, onToggleMobile }: PublicNavbarProps) {
  const desktopAuthActions =
    authState.status === "checking" ? (
      <div className="h-8 w-36 animate-pulse rounded-md bg-slate-700/30" />
    ) : authState.status === "authenticated" ? (
      <Link
        className="rounded-md bg-gradient-to-r from-blue-500 to-cyan-400 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-lg shadow-cyan-900/40 transition-opacity hover:opacity-90 sm:text-sm"
        to={authState.dashboardPath}
      >
        Dashboard
      </Link>
    ) : (
      <>
        <Link
          className="rounded-md border border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-100 transition-colors hover:border-cyan-300 hover:text-cyan-200 sm:text-sm"
          to="/login"
        >
          Login
        </Link>
        <Link
          className="rounded-md bg-gradient-to-r from-blue-500 to-cyan-400 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-lg shadow-cyan-900/40 transition-opacity hover:opacity-90 sm:text-sm"
          to="/register"
        >
          Register
        </Link>
      </>
    );

  const mobileAuthActions =
    authState.status === "checking" ? (
      <div className="h-11 animate-pulse rounded-md bg-slate-700/30" />
    ) : authState.status === "authenticated" ? (
      <Link
        className="inline-flex items-center justify-center rounded-md bg-gradient-to-r from-blue-500 to-cyan-400 px-3 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-900/40 transition-opacity hover:opacity-90"
        onClick={onCloseMobile}
        to={authState.dashboardPath}
      >
        Dashboard
      </Link>
    ) : (
      <div className="grid grid-cols-2 gap-2.5">
        <Link
          className="inline-flex items-center justify-center rounded-md border border-slate-500 bg-[#041337] px-3 py-2.5 text-sm font-semibold text-slate-100 transition-colors hover:border-cyan-300 hover:text-cyan-200"
          onClick={onCloseMobile}
          to="/login"
        >
          Login
        </Link>
        <Link
          className="inline-flex items-center justify-center rounded-md bg-gradient-to-r from-blue-500 to-cyan-400 px-3 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-900/40 transition-opacity hover:opacity-90"
          onClick={onCloseMobile}
          to="/register"
        >
          Register
        </Link>
      </div>
    );

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#030817]/85 backdrop-blur-xl">
        <div className="container py-2">
          <div className="flex min-h-16 items-center justify-between gap-3">
            <Link className="group inline-flex items-center gap-2" to="/">
              <span className="inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-cyan-300/60 bg-cyan-500/20 shadow-[0_0_14px_rgba(34,211,238,0.45)] ring-1 ring-cyan-200/40">
                <img
                  alt="Arbitrum icon"
                  className="h-[76%] w-[76%] object-contain brightness-110 contrast-125"
                  src={arbitrumIcon}
                />
              </span>
              <span className="text-base font-extrabold tracking-wide text-slate-100 sm:text-lg">ARBITRUM</span>
            </Link>

            <nav className="hidden flex-wrap items-center gap-2 text-xs lg:flex xl:text-sm">
              {navItems.map((item) => (
                <button
                  className="rounded-full px-3 py-1.5 font-medium text-slate-300 transition-colors hover:bg-cyan-400/10 hover:text-cyan-200"
                  key={item.id}
                  onClick={() => onNavClick(item.id)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="hidden items-center gap-2 lg:flex">{desktopAuthActions}</div>

            <button
              aria-expanded={mobileOpen}
              aria-label="Toggle menu"
              className="inline-flex size-10 items-center justify-center rounded-md border border-cyan-300/30 bg-slate-900/70 text-cyan-200 lg:hidden"
              onClick={onToggleMobile}
              type="button"
            >
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </header>

      <div
        className={`fixed inset-0 z-50 bg-[#01030a]/90 transition-opacity duration-300 lg:hidden ${
          mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onCloseMobile}
      />
      <aside
        className={`fixed right-0 top-0 z-[60] h-screen w-[86%] max-w-sm border-l border-cyan-300/30 bg-gradient-to-b from-[#031330] via-[#031024] to-[#020817] p-4 shadow-[0_0_0_1px_rgba(56,189,248,0.15),0_25px_70px_rgba(0,0,0,0.65)] transition-transform duration-300 lg:hidden ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between">
          <Link className="inline-flex items-center gap-2" onClick={onCloseMobile} to="/">
            <span className="inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-cyan-300/60 bg-cyan-500/20 shadow-[0_0_14px_rgba(34,211,238,0.45)] ring-1 ring-cyan-200/40">
              <img
                alt="Arbitrum icon"
                className="h-[76%] w-[76%] object-contain brightness-110 contrast-125"
                src={arbitrumIcon}
              />
            </span>
            <span className="text-base font-extrabold tracking-wide text-slate-100">ARBITRUM</span>
          </Link>
          <button
            aria-label="Close menu"
            className="inline-flex size-10 items-center justify-center rounded-md border border-cyan-300/30 bg-slate-900/70 text-cyan-200"
            onClick={onCloseMobile}
            type="button"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="mt-4">
          <nav className="grid grid-cols-1 gap-2.5 text-sm">
            {navItems.map((item) => (
              <button
                className="rounded-md px-2 py-2.5 text-left font-semibold text-slate-100 transition-colors hover:bg-cyan-400/10 hover:text-cyan-200"
                key={item.id}
                onClick={() => onNavClick(item.id)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </nav>
          <div className="mt-3">{mobileAuthActions}</div>
        </div>
      </aside>
    </>
  );
}
