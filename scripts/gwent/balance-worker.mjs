import { parentPort, workerData } from 'node:worker_threads';
import { createMatch, playCard, passRound, resolveChoice } from '../../webapp/gwent-engine.js';
import { chooseAiAction, seededRandom } from '../../webapp/gwent-ai.js';
import { aiLoadout, buildDeck } from '../../webapp/gwent-builder.js';

function play(rules, a, b, seed) {
  const rng = seededRandom(seed);
  let state = createMatch({ playerDeck: buildDeck(aiLoadout(a, 'hard', rng, rules)), aiDeck: buildDeck(aiLoadout(b, 'hard', rng, rules)), rng });
  let starter = null;
  for (let step = 0; step < 800 && state.phase === 'playing'; step += 1) {
    const side = state.pending ? state.pending.side : state.turn;
    if (starter === null && !state.pending) starter = state.turn;
    const action = chooseAiAction(state, { level: 'medium', side, rng, budgetMs: 20 });
    const result = action.type === 'choice' ? resolveChoice(state, side, action.id) : action.type === 'pass' ? passRound(state, side) : playCard(state, side, action.uid, action);
    if (!result.state) throw new Error(`${a} v ${b}: ${result.error}`);
    state = result.state;
  }
  return { winner: state.winner, starter };
}
parentPort.postMessage(workerData.jobs.map(job => ({ ...job, ...play(workerData.rules, job.a, job.b, job.seed) })));
