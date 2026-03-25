import { customers, products, plants, orders, orderItems, deliveries, invoices, billingItems, payments, journalEntries } from '../data/dataset';

export function executeQuery(intent, params = {}) {
  switch (intent) {

    case 'products_by_billing': {
      const count = {};
      billingItems.forEach(i => { count[i.material] = (count[i.material] || 0) + 1; });
      return products
        .map(p => ({ ...p, billingCount: count[p.id] || 0 }))
        .sort((a, b) => b.billingCount - a.billingCount)
        .slice(0, 10);
    }

    case 'trace_billing': {
      const inv = invoices.find(i => i.id === params.docId);
      if (!inv) return null;
      const customer = customers.find(c => c.id === inv.customerId);
      const items = billingItems.filter(i => i.billingDocument === inv.id);
      const deliveryIds = [...new Set(items.map(i => i.deliveryDocument))];
      const relDeliveries = deliveries.filter(d => deliveryIds.includes(d.id));
      const salesOrderIds = [...new Set(relDeliveries.flatMap(d => d.salesOrders || []))];
      const relOrders = orders.filter(o => salesOrderIds.includes(o.id));
      const payment = payments.find(p => p.accountingDocument === inv.accountingDocument);
      const je = journalEntries.find(j => j.accountingDocument === inv.accountingDocument);
      const mats = items.map(i => ({ ...i, product: products.find(p => p.id === i.material) }));
      return { inv, customer, items: mats, deliveries: relDeliveries, orders: relOrders, payment, je };
    }

    case 'broken_flows': {
      const deliveredOrders = new Set(deliveries.flatMap(d => d.salesOrders || []));
      const ordersNoDelivery = orders.filter(o => !deliveredOrders.has(o.id));
      const billedDeliveries = new Set(billingItems.map(i => i.deliveryDocument));
      const deliveriesNoBilling = deliveries.filter(d => !billedDeliveries.has(d.id));
      const cancelledInvoices = invoices.filter(i => i.isCancelled);
      const paidDocs = new Set(payments.map(p => p.accountingDocument));
      const unpaidInvoices = invoices.filter(i => !i.isCancelled && !paidDocs.has(i.accountingDocument));
      return {
        ordersNoDelivery: ordersNoDelivery.slice(0, 8),
        deliveriesNoBilling: deliveriesNoBilling.slice(0, 8),
        cancelledInvoices: cancelledInvoices.slice(0, 8),
        unpaidInvoices: unpaidInvoices.slice(0, 8),
        totalOrdersNoDelivery: ordersNoDelivery.length,
        totalDeliveriesNoBilling: deliveriesNoBilling.length,
        totalCancelled: cancelledInvoices.length,
        totalUnpaid: unpaidInvoices.length,
      };
    }

    case 'customer_summary': {
      return customers.map(c => {
        const cOrders = orders.filter(o => o.customerId === c.id);
        const cInvoices = invoices.filter(i => i.customerId === c.id);
        const activeInvoices = cInvoices.filter(i => !i.isCancelled);
        const totalRevenue = activeInvoices.reduce((s, i) => s + (i.amount || 0), 0);
        const paidDocs = new Set(payments.map(p => p.accountingDocument));
        const paidAmount = activeInvoices
          .filter(i => paidDocs.has(i.accountingDocument))
          .reduce((s, i) => s + (i.amount || 0), 0);
        return {
          ...c,
          orderCount: cOrders.length,
          invoiceCount: cInvoices.length,
          cancelledCount: cInvoices.filter(i => i.isCancelled).length,
          totalRevenue: parseFloat(totalRevenue.toFixed(2)),
          paidAmount: parseFloat(paidAmount.toFixed(2)),
        };
      }).sort((a, b) => b.totalRevenue - a.totalRevenue);
    }

    case 'cancelled_invoices': {
      return invoices
        .filter(i => i.isCancelled)
        .map(i => ({ ...i, customer: customers.find(c => c.id === i.customerId) }))
        .slice(0, 20);
    }

    case 'all_orders': {
      const deliveredOrders = new Set(deliveries.flatMap(d => d.salesOrders || []));
      const billedOrderSet = new Set(
        billingItems.flatMap(bi => {
          const del = deliveries.find(d => d.id === bi.deliveryDocument);
          return del?.salesOrders || [];
        })
      );
      return orders.slice(0, 30).map(o => ({
        ...o,
        customer: customers.find(c => c.id === o.customerId),
        hasDelivery: deliveredOrders.has(o.id),
        hasBilling: billedOrderSet.has(o.id),
        itemCount: orderItems.filter(oi => oi.orderId === o.id).length,
      }));
    }

    case 'revenue_by_customer': {
      return customers.map(c => {
        const revenue = invoices
          .filter(i => i.customerId === c.id && !i.isCancelled)
          .reduce((s, i) => s + (i.amount || 0), 0);
        return { name: c.name || c.id, customerId: c.id, city: c.city || '—', revenue: parseFloat(revenue.toFixed(2)) };
      }).sort((a, b) => b.revenue - a.revenue);
    }

    case 'payment_summary': {
      const totalPaid = payments.reduce((s, p) => s + Math.abs(p.amount || 0), 0);
      const paidDocs = new Set(payments.map(p => p.accountingDocument));
      const unpaidInvoices = invoices.filter(i => !i.isCancelled && !paidDocs.has(i.accountingDocument));
      const totalUnpaid = unpaidInvoices.reduce((s, i) => s + (i.amount || 0), 0);
      return {
        totalPayments: payments.length,
        totalPaid: parseFloat(totalPaid.toFixed(2)),
        unpaidInvoices: unpaidInvoices.length,
        totalUnpaid: parseFloat(totalUnpaid.toFixed(2)),
        recentPayments: payments.slice(0, 10),
      };
    }

    case 'delivery_summary': {
      const billedDeliveries = new Set(billingItems.map(i => i.deliveryDocument));
      return deliveries.slice(0, 20).map(d => ({
        ...d,
        isBilled: billedDeliveries.has(d.id),
        salesOrderCount: (d.salesOrders || []).length,
      }));
    }

    default:
      return null;
  }
}