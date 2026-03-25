import { useState } from 'react';
import { TYPE_COLORS } from '../lib/graphBuilder';
import './SchemaPanel.css';

const SCHEMA = [
  { name: 'Customer', count: 5, fields: ['id', 'name', 'region', 'segment', 'contact'] },
  { name: 'Order', count: 8, fields: ['id', 'customerId→Customer', 'date', 'status', 'totalAmount', 'salesRep'] },
  { name: 'OrderItem', count: 11, fields: ['id', 'orderId→Order', 'productId→Product', 'quantity', 'unitPrice', 'lineTotal'] },
  { name: 'Product', count: 6, fields: ['id', 'name', 'category', 'price', 'unit'] },
  { name: 'Delivery', count: 6, fields: ['id', 'orderId→Order', 'addressId→Address', 'date', 'status', 'carrier'] },
  { name: 'Invoice', count: 5, fields: ['id', 'orderId→Order', 'deliveryId→Delivery', 'amount', 'status', 'dueDate'] },
  { name: 'Payment', count: 3, fields: ['id', 'invoiceId→Invoice', 'date', 'amount', 'method', 'journalEntry→JE'] },
  { name: 'JournalEntry', count: 3, fields: ['id', 'paymentId→Payment', 'date', 'debit', 'credit', 'amount'] },
  { name: 'Address', count: 4, fields: ['id', 'street', 'city', 'state', 'plant'] },
];

export default function SchemaPanel() {
  const [expanded, setExpanded] = useState(new Set(['Customer', 'Order']));

  const toggle = (name) => setExpanded(s => {
    const ns = new Set(s);
    ns.has(name) ? ns.delete(name) : ns.add(name);
    return ns;
  });

  return (
    <div className="schema-panel">
      <div className="schema-intro">
        <p>9 entity types · 47 nodes · 54 edges</p>
      </div>
      {SCHEMA.map(e => (
        <div key={e.name} className="schema-entity">
          <div className="schema-header" onClick={() => toggle(e.name)}>
            <span className="ent-dot" style={{ background: TYPE_COLORS[e.name] }} />
            <span className="ent-name">{e.name}</span>
            <span className="ent-count">{e.count} rows</span>
            <span className="ent-toggle">{expanded.has(e.name) ? '▲' : '▼'}</span>
          </div>
          {expanded.has(e.name) && (
            <div className="schema-fields">
              {e.fields.map(f => {
                const isRef = f.includes('→');
                const [name, ref] = f.split('→');
                return (
                  <div key={f} className="schema-field">
                    <span className="field-name">{name}</span>
                    {isRef && <span className="field-ref">→ {ref}</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
