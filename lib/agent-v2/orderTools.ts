import type { ToolDefinition } from './types';
import { createCommerceReadTool } from './commerce';
import { requireRecord, requireString } from './inputValidation';

export type OrderExecutor = {
  getOrderStatus?: (orderId: string) => Promise<unknown>;
  getDeliveryEstimate?: (input: { orderId: string; postalCode?: string }) => Promise<unknown>;
};

export function registerOrderTools(executor: OrderExecutor): ToolDefinition[] {
  const tools: ToolDefinition[] = [];
  if (executor.getOrderStatus) {
    tools.push(createCommerceReadTool('get_order_status', 'Read the current status of an order. This is a non-consequential read operation.', async (input) => {
      const data = requireRecord(input, 'get_order_status');
      return executor.getOrderStatus!(requireString(data, 'orderId', 'get_order_status'));
    }));
  }
  if (executor.getDeliveryEstimate) {
    tools.push(createCommerceReadTool('get_delivery_estimate', 'Read an estimated delivery date for an order.', async (input) => {
      const data = requireRecord(input, 'get_delivery_estimate');
      return executor.getDeliveryEstimate!({
        orderId: requireString(data, 'orderId', 'get_delivery_estimate'),
        ...(typeof data.postalCode === 'string' && data.postalCode.trim() ? { postalCode: data.postalCode.trim() } : {}),
      });
    }));
  }
  return tools;
}
