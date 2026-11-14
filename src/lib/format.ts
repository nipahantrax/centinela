// Deterministic across server (workerd) and browser: ICU inserts NBSP/narrow
// NBSP before "a. m." in the browser but a plain space in workerd, which would
// break hydration. Normalize those spaces so both renders match byte-for-byte.
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("es-BO", { timeZone: "America/La_Paz", dateStyle: "short", timeStyle: "medium" })
    .format(new Date(iso))
    .replace(/[  ]/g, " ");
}
