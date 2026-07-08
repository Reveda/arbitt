import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type LandingCardSelectionContextValue = {
  activeCardKey: string | null;
  setActiveCardKey: (key: string | null) => void;
};

const LandingCardSelectionContext = createContext<LandingCardSelectionContextValue | null>(null);

type LandingCardSelectionProviderProps = {
  children: ReactNode;
};

export function LandingCardSelectionProvider({ children }: LandingCardSelectionProviderProps) {
  const [activeCardKey, setActiveCardKey] = useState<string | null>(null);

  const value = useMemo(
    () => ({
      activeCardKey,
      setActiveCardKey,
    }),
    [activeCardKey]
  );

  return <LandingCardSelectionContext.Provider value={value}>{children}</LandingCardSelectionContext.Provider>;
}

export function useLandingCardSelection() {
  const context = useContext(LandingCardSelectionContext);

  if (!context) {
    throw new Error("useLandingCardSelection must be used within LandingCardSelectionProvider");
  }

  return context;
}
