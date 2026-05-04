import { createContext, useContext, type ReactNode } from "react";

const PortfolioDemoContext = createContext(false);

export function PortfolioDemoProvider({ children }: { children: ReactNode }) {
  return (
    <PortfolioDemoContext.Provider value={true}>{children}</PortfolioDemoContext.Provider>
  );
}

export function usePortfolioDemo() {
  return useContext(PortfolioDemoContext);
}
