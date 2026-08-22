import type { ToolDefinition, AgentState } from './types';
import { createCommerceReadTool } from './commerce';
import { requireRecord, requireString } from './inputValidation';
export type OrderExecutor = { getOrderStatus?: (orderId: string) => Promise<unknown>; getDeliveryEstimate?: (input: { orderId: string; postalCode?: string }) => Promise<unknown>; authorizeOrder?: (userId: string, orderId: string) => Promise<boolean> };
function authorized(executor: OrderExecutor, input: unknown, state: AgentState): Promise<boolean> | boolean {
  if (!executor.authorizeOrder) return false;
  const data = requireRecord(input, 'order'); const orderId = requireString(data, 'orderId', 'order');
  const userId = state.security?.userId?.trim() || (typeof state.constraints.userId === 'string' ? state.constraints.userId.trim() : '');
  if (!userId) return false; return executor.authorizeOrder(userId, orderId);
}
export function registerOrderTools(executor: OrderExecutor): ToolDefinition[] {
  const tools: ToolDefinition[] = [];
  if (executor.getOrderStatus) tools.push(createCommerceReadTool('get_order_status', 'Read the current status of an order owned by the current user.', async (input, state) => { if (!(await authorized(executor, input, state))) throw new Error('Order authorization denied.'); const data = requireRecord(input, 'get_order_status'); return executor.getOrderStatus!(requireString(data, 'orderId', 'get_order_status')); }));
  if (executor.getDeliveryEstimate) tools.push(createCommerceReadTool('get_delivery_estimate', 'Read delivery information for an order owned by the current user.', async (input, state) => { if (!(await authorized(executor, input, state))) throw new Error('Order authorization denied.'); const data = requireRecord(input, 'get_delivery_estimate'); return executor.getDeliveryEstimate!({ orderId: requireString(data, 'orderId', 'get_delivery_estimate'), ...(typeof data.postalCode === 'string' && data.postalCode.trim() ? { postalCode: data.postalCode.trim() } : {}) }); }));
  return tools;
}
