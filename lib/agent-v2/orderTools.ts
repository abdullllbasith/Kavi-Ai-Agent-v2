import type { ToolDefinition } from './types';
import { createCommerceReadTool } from './commerce';

export type OrderExecutor = {
  getOrderStatus?: (orderId: string) => Promise<unknown>;
  getDeliveryEstimate?: (input: { orderId: string; postalCode?: string }) => Promise<unknown>;
};

export function registerOrderTools(executor: OrderExecutor): ToolDefinition[] {
  const tools: ToolDefinition[] = [];
  if (executor.getOrderStatus) {
    tools.push(createCommerceReadTool(
      'get_order_status',
      'Read the current status of an order. This is a non-consequential read operation.',
      async (input) => {
        const orderId = (input as { orderId?: string })?.orderId;
        if (!orderId) throw new Error('orderId is required.');
        return executor.getOrderStatus!(orderId);
      },
    ));
  }
  if (executor.getDeliveryEstimate) {
    tools.push(createCommerceReadTool(
      'get_delivery_estimate',
      'Read an estimated delivery date for an order.',
      async (input) => {
        const data = input as { orderId?: string; postalCode?: string };
        if (!data.orderId) throw new Error('orderId is required.');
        return executor.getDeliveryEstimate!(data);
      },
    ));
  }
  return tools;
}
