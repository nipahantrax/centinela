// Leaflet popup strings are HTML; external labels must never become markup.
export function escapeMapText(value: unknown): string {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] ?? char));
}