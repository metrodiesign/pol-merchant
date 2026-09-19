"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getAgentRegistration, registrationRedirect, resolveRegistrationUiState, type AgentRegistrationCase, type RegistrationUiState } from "@/lib/api/agent-registration";

export function useRegistrationCase(route: "form" | "verify" | "pending") {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<RegistrationUiState>({ kind: "form" });
  const [caseData, setCaseData] = useState<AgentRegistrationCase | null>(null);
  const reload = useCallback(async () => {
    const result = await getAgentRegistration();
    const next = resolveRegistrationUiState(result);
    setState(next);
    setCaseData(result.ok ? result.value : null);
    const redirect = registrationRedirect(route, next);
    if (redirect && pathname !== redirect) router.replace(redirect);
  }, [pathname, route, router]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial API bootstrap resolves asynchronously.
    void reload();
  }, [reload]);
  return { state, caseData, reload };
}
