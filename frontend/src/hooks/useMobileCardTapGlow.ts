import { useEffect } from "react";

const CARD_SELECTOR = ".interactive-card, .glass-card, .hover-lift, .dashboard-marquee-card";

export function useMobileCardTapGlow() {
  useEffect(() => {
    const isTouchLikeDevice = window.matchMedia("(hover: none), (pointer: coarse)").matches;
    if (!isTouchLikeDevice) {
      return;
    }

    const activeTimers = new WeakMap<HTMLElement, number>();

    const applyTapGlow = (target: EventTarget | null) => {
      if (!(target instanceof Element)) {
        return;
      }

      const card = target.closest<HTMLElement>(CARD_SELECTOR);
      if (!card) {
        return;
      }

      if (card.classList.contains("form-motion-off") || card.querySelector("form")) {
        return;
      }

      const existingTimer = activeTimers.get(card);
      if (existingTimer) {
        window.clearTimeout(existingTimer);
      }

      card.classList.remove("tap-glow-active");
      // Force reflow so repeat taps replay feedback cleanly.
      void card.offsetWidth;
      card.classList.add("tap-glow-active");

      const timerId = window.setTimeout(() => {
        card.classList.remove("tap-glow-active");
        activeTimers.delete(card);
      }, 380);

      activeTimers.set(card, timerId);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse") {
        return;
      }
      applyTapGlow(event.target);
    };

    const onTouchStart = (event: TouchEvent) => {
      applyTapGlow(event.target);
    };

    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });

    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("touchstart", onTouchStart);
    };
  }, []);
}

