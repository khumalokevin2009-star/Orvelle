"use client";

import { createContext, useContext, type ReactNode } from "react";
import {
  defaultBusinessVertical,
  defaultSolutionMode,
  type BusinessVertical,
  type SolutionMode
} from "@/lib/solution-mode";

type BusinessAccountContextValue = {
  businessId: string;
  businessName: string;
  solutionMode: SolutionMode;
  businessVertical: BusinessVertical;
};

const defaultBusinessAccountContextValue: BusinessAccountContextValue = {
  businessId: "",
  businessName: "Business Account",
  solutionMode: defaultSolutionMode,
  businessVertical: defaultBusinessVertical
};

const BusinessAccountContext = createContext<BusinessAccountContextValue>(defaultBusinessAccountContextValue);

export function SolutionModeProvider({
  children,
  solutionMode = defaultSolutionMode,
  businessId = defaultBusinessAccountContextValue.businessId,
  businessName = defaultBusinessAccountContextValue.businessName,
  businessVertical = defaultBusinessAccountContextValue.businessVertical
}: {
  children: ReactNode;
  solutionMode?: SolutionMode;
  businessId?: string;
  businessName?: string;
  businessVertical?: BusinessVertical;
}) {
  return (
    <BusinessAccountContext.Provider
      value={{
        businessId,
        businessName,
        solutionMode,
        businessVertical
      }}
    >
      {children}
    </BusinessAccountContext.Provider>
  );
}

export function useCurrentBusinessAccount(
  overrides?: Partial<BusinessAccountContextValue>
) {
  const inheritedBusinessAccount = useContext(BusinessAccountContext);

  return {
    businessId: overrides?.businessId ?? inheritedBusinessAccount.businessId,
    businessName: overrides?.businessName ?? inheritedBusinessAccount.businessName,
    solutionMode: overrides?.solutionMode ?? inheritedBusinessAccount.solutionMode ?? defaultSolutionMode,
    businessVertical:
      overrides?.businessVertical ??
      inheritedBusinessAccount.businessVertical ??
      defaultBusinessVertical
  };
}

export function useSolutionMode(solutionMode?: SolutionMode) {
  return useCurrentBusinessAccount(
    solutionMode ? { solutionMode } : undefined
  ).solutionMode;
}
