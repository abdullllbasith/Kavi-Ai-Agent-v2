import type { AgentState } from './types';

export type PendingConfirmation = {
  action: 'add_to_cart' | 'checkout' | 'cancel_order';
  input: unknown;
  explanation: string;
};

export function requestCommerceConfirmation(
  state: AgentState,
  action: PendingConfirmation['action'],
  input: unknown,
): AgentState {
  return {
    ...state,
    status: 'waiting_for_user',
    pendingQuestion: `Please confirm that I should ${action.replaceAll('_', ' ')}.`,
    constraints: {
      ...state.constraints,
      pendingCommerceConfirmation: { action, input },
    },
  };
}

export function confirmCommerceAction(state: AgentState): AgentState {
  return {
    ...state,
    constraints: {
      ...state.constraints,
      commerceConfirmed: true,
      pendingCommerceConfirmation: undefined,
    },
    status: 'planning',
    pendingQuestion: undefined,
  };
}
