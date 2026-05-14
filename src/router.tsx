import { QueryClient } from "@tanstack/react-query";
import { createRouter, Outlet } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { AuthProvider } from "./contexts/AuthContext";
import type { ReactNode } from "react";

function AppWrap({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

export function getRouter() {
  const queryClient = new QueryClient();
  return createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: "intent",
    scrollRestoration: true,
    defaultComponent: Outlet,
    Wrap: AppWrap,
  });
}

declare module "@tanstack/react-start" {
  interface Register {
    ssr: true;
    router: ReturnType<typeof getRouter>;
  }
}
