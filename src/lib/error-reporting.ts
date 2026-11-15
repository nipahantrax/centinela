export function reportError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") {
    console.error("[CENTINELA Error]", error, context);
    return;
  }
  console.error("[CENTINELA Error]", error, {
    route: window.location.pathname,
    ...context,
  });
}
