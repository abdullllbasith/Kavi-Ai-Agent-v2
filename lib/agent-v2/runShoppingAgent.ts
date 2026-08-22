import { runAgentLoop } from './agentLoop';
import { createAgentState } from './state';
import { createKaprukaSearchRegistry } from './createKaprukaSearch';
import { createShoppingController } from './shoppingController';

export async function runKaviShoppingAgent(userMessage: string) {
  const state = createAgentState(userMessage, 6);
  const { registry, session } = createKaprukaSearchRegistry();
  const controller = createShoppingController(session);

  const finalState = await runAgentLoop(state, registry, controller);

  return {
    state: finalState,
    selectedProductIds: session.selectedIds,
    searches: session.searches,
    completed: session.completed,
  };
}
