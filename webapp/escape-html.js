const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };

/** The one HTML escaper for every `innerHTML` template in the Mini App. */
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ENTITIES[char]);
}
