export type Actor = { userId: string; roles?: string[] };

export type ResourceAuthorization = {
  canAccessOrder?: (actor: Actor, orderId: string) => Promise<boolean>;
  canAccessProduct?: (actor: Actor, productId: string) => Promise<boolean>;
};

export function requireActor(actor?: Actor): Actor {
  if (!actor?.userId?.trim()) throw new Error('Authenticated user is required.');
  return actor;
}

export async function requireOrderAccess(actor: Actor | undefined, orderId: string, authorization: ResourceAuthorization): Promise<Actor> {
  const current = requireActor(actor);
  if (!orderId.trim()) throw new Error('orderId is required.');
  if (authorization.canAccessOrder && !(await authorization.canAccessOrder(current, orderId))) throw new Error('Not authorized to access this order.');
  return current;
}

export async function requireProductAccess(actor: Actor | undefined, productId: string, authorization: ResourceAuthorization): Promise<Actor> {
  const current = requireActor(actor);
  if (!productId.trim()) throw new Error('productId is required.');
  if (authorization.canAccessProduct && !(await authorization.canAccessProduct(current, productId))) throw new Error('Not authorized to access this product.');
  return current;
}
