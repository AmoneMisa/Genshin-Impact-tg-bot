// Runs the Gwent AI search off the main thread, so a strong opponent never freezes the interface.
import { chooseAiAction } from './gwent-ai.js';

self.onmessage = ({ data }) => {
  let action = null;
  try { action = chooseAiAction(data.state, data.options); } catch { action = undefined; }
  self.postMessage({ id: data.id, action });
};
