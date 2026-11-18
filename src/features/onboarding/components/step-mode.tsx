"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * The same step forms serve onboarding and profile editing.
 * In "edit" mode the submit button says Save and the form tells the server action to
 * return to the profile instead of advancing onboarding.
 */
export type StepMode = "onboarding" | "edit";

const StepModeContext = createContext<StepMode>("onboarding");

export function StepModeProvider({ mode, children }: { mode: StepMode; children: ReactNode }) {
  return <StepModeContext.Provider value={mode}>{children}</StepModeContext.Provider>;
}

export function useStepMode(): StepMode {
  return useContext(StepModeContext);
}
