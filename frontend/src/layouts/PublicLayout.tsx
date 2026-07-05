import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Headset } from "lucide-react";
import { APP_ROUTES } from "@/api/endpoints";
import { LandingScrollProgress } from "@/components/common/LandingScrollProgress";
import { PublicFooter } from "@/components/layout/public/PublicFooter";
import { PublicNavbar, type PublicAuthNavState, type PublicNavItem } from "@/components/layout/public/PublicNavbar";
import { getDashboardRouteForUser } from "@/lib/authNavigation";
import { authService } from "@/services/auth.service";

const navItems: PublicNavItem[] = [
  { id: "home", label: "Home" },
  { id: "about", label: "About" },
  { id: "how-it-works", label: "How It Works" },
  { id: "features", label: "Features" }
];

export function PublicLayout() {
  const telegramUrl = "https://t.me/your_telegram_username";
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [authNavState, setAuthNavState] = useState<PublicAuthNavState>({ status: "checking" });
  const isAuthPage = ["/login", "/register", "/forgot-password", "/verify-email"].includes(location.pathname);
  const isHomePage = location.pathname === "/";

  const scrollToSection = useCallback((sectionId: string) => {
    const section = document.getElementById(sectionId);
    if (!section) {
      return;
    }

    const header = document.querySelector("header");
    const headerOffset = header instanceof HTMLElement ? header.offsetHeight + 12 : 88;
    const targetTop = section.getBoundingClientRect().top + window.scrollY - headerOffset;

    window.scrollTo({
      top: Math.max(targetTop, 0),
      behavior: "smooth"
    });
  }, []);

  const handleNavClick = useCallback(
    (sectionId: string) => {
      setMobileOpen(false);

      if (location.pathname !== "/") {
        navigate("/", { state: { scrollTo: sectionId } });
        return;
      }

      scrollToSection(sectionId);
    },
    [location.pathname, navigate, scrollToSection]
  );

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    let active = true;

    authService
      .getCurrentUser()
      .then((response) => {
        if (!active) {
          return;
        }

        const user = response.data.user;

        if (!user.emailVerified) {
          setAuthNavState({
            dashboardPath: APP_ROUTES.public.verifyEmail,
            status: "authenticated"
          });
          return;
        }

        setAuthNavState({
          dashboardPath: getDashboardRouteForUser(user),
          status: "authenticated"
        });
      })
      .catch(() => {
        if (active) {
          setAuthNavState({ status: "guest" });
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!mobileOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (location.pathname === "/" && location.hash) {
      const sectionId = location.hash.replace("#", "");
      const timeoutId = window.setTimeout(() => {
        scrollToSection(sectionId);
        navigate("/", { replace: true });
      }, 40);

      return () => window.clearTimeout(timeoutId);
    }

    return undefined;
  }, [location.pathname, location.hash, navigate, scrollToSection]);

  useEffect(() => {
    const state = (location.state ?? null) as { scrollTo?: string } | null;
    if (location.pathname === "/" && state?.scrollTo) {
      const timeoutId = window.setTimeout(() => {
        scrollToSection(state.scrollTo ?? "");
        navigate("/", { replace: true, state: null });
      }, 40);

      return () => window.clearTimeout(timeoutId);
    }

    return undefined;
  }, [location.pathname, location.state, navigate, scrollToSection]);

  useEffect(() => {
    if (!isAuthPage) {
      setKeyboardOpen(false);
      return;
    }

    const viewport = window.visualViewport;
    if (!viewport) {
      return;
    }

    const checkKeyboard = () => {
      const keyboardHeight = window.innerHeight - viewport.height;
      setKeyboardOpen(keyboardHeight > 140);
    };

    checkKeyboard();
    viewport.addEventListener("resize", checkKeyboard);
    viewport.addEventListener("scroll", checkKeyboard);

    return () => {
      viewport.removeEventListener("resize", checkKeyboard);
      viewport.removeEventListener("scroll", checkKeyboard);
    };
  }, [isAuthPage]);

  useEffect(() => {
    if (!isAuthPage) {
      return;
    }

    const pendingTimers: number[] = [];

    const isMobileViewport = () => window.matchMedia("(max-width: 1023px)").matches;

    const isInputField = (element: EventTarget | null): element is HTMLElement => {
      if (!(element instanceof HTMLElement)) {
        return false;
      }
      const tagName = element.tagName.toLowerCase();
      return tagName === "input" || tagName === "textarea" || element.isContentEditable;
    };

    const ensureFieldVisible = (target: HTMLElement, behavior: ScrollBehavior = "smooth") => {
      if (!isMobileViewport()) {
        return;
      }

      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const rect = target.getBoundingClientRect();
      const topSafe = 86;
      const bottomSafe = 18;

      if (rect.bottom > viewportHeight - bottomSafe || rect.top < topSafe) {
        target.scrollIntoView({ block: "nearest", inline: "nearest", behavior });
      }
    };

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!isInputField(target)) {
        return;
      }

      // First pass: immediate focus adjustment.
      pendingTimers.push(window.setTimeout(() => ensureFieldVisible(target, "smooth"), 120));
      // Second pass: after keyboard resize settles (fixes last-field overlap).
      pendingTimers.push(window.setTimeout(() => ensureFieldVisible(target, "smooth"), 320));
    };

    const onViewportChange = () => {
      const active = document.activeElement;
      if (!isInputField(active)) {
        return;
      }
      ensureFieldVisible(active, "smooth");
    };

    const viewport = window.visualViewport;
    window.addEventListener("focusin", onFocusIn);
    viewport?.addEventListener("resize", onViewportChange);
    viewport?.addEventListener("scroll", onViewportChange);

    return () => {
      window.removeEventListener("focusin", onFocusIn);
      viewport?.removeEventListener("resize", onViewportChange);
      viewport?.removeEventListener("scroll", onViewportChange);
      pendingTimers.forEach((timerId) => window.clearTimeout(timerId));
    };
  }, [isAuthPage]);

  useEffect(() => {
    const enableTouchActive = () => {
      // No-op listener enables :active feedback reliability on iOS Safari.
    };
    document.body.addEventListener("touchstart", enableTouchActive, { passive: true });
    return () => document.body.removeEventListener("touchstart", enableTouchActive);
  }, []);

  return (
    <div className="min-h-screen">
      <PublicNavbar
        authState={authNavState}
        mobileOpen={mobileOpen}
        navItems={navItems}
        onCloseMobile={() => setMobileOpen(false)}
        onNavClick={handleNavClick}
        onToggleMobile={() => setMobileOpen((prev) => !prev)}
      />

      <main
        className={`container ${
          isAuthPage
            ? "flex min-h-[calc(100dvh-8.5rem)] items-center justify-center overflow-y-auto py-4 pb-24 sm:py-6 sm:pb-10 md:py-8 lg:pb-8"
            : isHomePage
              ? "pt-0 pb-6 sm:pt-0 sm:pb-8 md:pt-1 md:pb-8"
              : "py-5 sm:py-6 md:py-8"
        }`}
      >
        <Outlet />
      </main>

      {isHomePage ? <LandingScrollProgress /> : null}

      {isAuthPage && !keyboardOpen ? (
        <a
          aria-label="Open Telegram support"
          className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-50 inline-flex size-11 items-center justify-center rounded-full border border-cyan-300/60 bg-[#041337]/95 text-cyan-200 shadow-[0_0_0_1px_rgba(56,189,248,0.35),0_12px_30px_rgba(2,8,23,0.75)] transition-all duration-200 hover:scale-105 hover:text-white sm:size-12"
          href={telegramUrl}
          rel="noreferrer"
          target="_blank"
        >
          <Headset className="size-4 sm:size-5" />
        </a>
      ) : null}

      {location.pathname === "/" ? <PublicFooter navItems={navItems} onNavClick={handleNavClick} /> : null}
    </div>
  );
}
