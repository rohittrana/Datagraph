import { customers, products, deliveries, invoices, billingItems, orders } from '../data/dataset';

export const TYPE_COLORS = {
  Customer: '#3b82f6',
  SalesOrder: '#8b5cf6',
  Delivery: '#f59e0b',
  BillingDoc: '#ef4444',
  Payment: '#f97316',
  Material: '#10b981',
};

export function buildGraph() {
  const nodes = [];
  const links = [];

  // Nodes — limit for performance
  customers.forEach(c => nodes.push({ id: c.id, label: c.name || c.id, type: 'Customer', color: TYPE_COLORS.Customer, data: c }));
  orders.slice(0, 30).forEach(o => nodes.push({ id: o.id, label: o.id, type: 'SalesOrder', color: TYPE_COLORS.SalesOrder, data: o }));
  deliveries.slice(0, 30).forEach(d => nodes.push({ id: d.id, label: d.id, type: 'Delivery', color: TYPE_COLORS.Delivery, data: d }));
  invoices.slice(0, 30).forEach(i => nodes.push({ id: i.id, label: i.id, type: 'BillingDoc', color: i.isCancelled ? '#94a3b8' : TYPE_COLORS.BillingDoc, data: i }));
  products.slice(0, 15).forEach(p => nodes.push({ id: p.id, label: p.name?.slice(0, 20) || p.id, type: 'Material', color: TYPE_COLORS.Material, data: p }));

  const nodeIds = new Set(nodes.map(n => n.id));

  // Links: Customer → SalesOrder
  orders.slice(0, 30).forEach(o => {
    if (nodeIds.has(o.customerId)) links.push({ source: o.customerId, target: o.id, label: 'PLACED' });
  });

  // Links: SalesOrder → Delivery
  deliveries.slice(0, 30).forEach(d => {
    d.salesOrders?.forEach(soId => {
      if (nodeIds.has(soId)) links.push({ source: soId, target: d.id, label: 'DELIVERED_AS' });
    });
  });

  // Links: Delivery → BillingDoc
  billingItems.forEach(bi => {
    if (nodeIds.has(bi.deliveryDocument) && nodeIds.has(bi.billingDocument)) {
      links.push({ source: bi.deliveryDocument, target: bi.billingDocument, label: 'BILLED_AS' });
    }
    if (nodeIds.has(bi.billingDocument) && nodeIds.has(bi.material)) {
      links.push({ source: bi.billingDocument, target: bi.material, label: 'INCLUDES' });
    }
  });

  // Deduplicate links
  const seen = new Set();
  const uniqueLinks = links.filter(l => {
    const key = `${l.source}-${l.target}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { nodes, links: uniqueLinks };
}
