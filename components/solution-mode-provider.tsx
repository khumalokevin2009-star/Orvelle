"use client";

import { createContext, useContext, type ReactNode } from "react";
import { defaultSolutionMode, type SolutionMode } from "@/lib/solution-mode";

const SolutionModeContext = createContext<SolutionMode>(defaultSolutionMode);

export function SolutionModeProvider({
  children,
  solutionMode = defaultSolutionMode
}: {
  children: ReactNode;
  solutionMode?: SolutionMode;
}) {
  return <SolutionModeContext.Provider value={solutionMode}>{children}</SolutionModeContext.Provider>;
}

export function useSolutionMode(solutionMode?: SolutionMode) {
  const inheritedSolutionMode = useContext(SolutionModeContext);
  return solutionMode ?? inheritedSolutionMode ?? defaultSolutionMode;
}
