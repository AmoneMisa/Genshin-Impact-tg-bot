// Runs the Gwent AI search off the main thread, so a strong opponent never freezes the interface.
import { decideAi } from './gwent-ai.js';

self.onmessage = ({ data }) => {
  let action = null;
  try { action = decideAi(data.state, data.seat, data.options); } catch { action = undefined; }
  self.postMessage({ id: data.id, action });
};
