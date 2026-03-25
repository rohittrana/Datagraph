import { useState, useRef, useEffect } from 'react';
import { askGroq } from '../lib/groqApi';
import { executeQuery } from '../lib/queryEngine';
import './ChatPanel.css';

const SUGGESTIONS = [
  'Show broken order flows',
  'Trace billing document 90504248',
  'Revenue by customer',
  'Which materials have most billing docs?',
  'Show cancelled invoices',
  'Payment summary',
];

const Badge = ({ status }) => {
  const cls = ['Active', 'Paid', 'Cleared', 'Delivered'].includes(status) ? 'badge-green'
    : ['Cancelled', 'Unpaid', 'Overdue'].includes(status) ? 'badge-red' : 'badge-yellow';
  return <span className={`badge ${cls}`}>{status}</span>;
};

function Table({ headers, rows }) {
  return (
    <table>
      <thead><tr>{headers.map(h => <th key={h}>{h}</th>)}</tr></thead>
      <tbody>{rows}</tbody>
    </table>
  );
}

function formatResult(intent, result, narrative) {
  const wrap = (content) => (
    <>
      <p style={{ marginBottom: result ? 10 : 0 }}>{narrative}</p>
      {content}
    </>
  );

  switch (intent) {

    case 'products_by_billing':
      return wrap(
        <Table headers={['Material', 'Name', 'Billing Docs']} rows={
          (result || []).map(p => (
            <tr key={p.id}>
              <td className="mono">{p.id}</td>
              <td>{(p.name || p.id)?.slice(0, 35)}</td>
              <td>{p.billingCount || 0}</td>
            </tr>
          ))
        } />
      );

    case 'trace_billing': {
      if (!result) return <p className="error-text">Billing document not found. Try a real ID like 90504248.</p>;
      const { inv, customer, items, deliveries: dels, orders: ords, payment, je } = result;
      const steps = [
        { icon: '👤', label: 'Customer', id: customer?.name || customer?.id || inv.customerId, detail: customer?.city, color: '#3b82f6' },
        { icon: '📋', label: 'Sales Orders', id: ords?.map(o => o.id).join(', ') || '—', detail: `${ords?.length || 0} orders`, color: '#8b5cf6' },
        { icon: '🚚', label: 'Deliveries', id: dels?.map(d => d.id).join(', ') || '—', detail: `${dels?.length || 0} deliveries`, color: '#f59e0b' },
        { icon: '🧾', label: 'Billing Doc', id: inv.id, detail: `₹${(inv.amount || 0).toLocaleString()} · ${inv.isCancelled ? 'Cancelled' : 'Active'}`, color: inv.isCancelled ? '#94a3b8' : '#ef4444' },
        { icon: '💳', label: 'Payment', id: payment?.accountingDocument || '—', detail: payment ? `₹${Math.abs(payment.amount || 0).toLocaleString()} · ${payment.clearingDate || ''}` : 'No payment found', color: '#f97316' },
        { icon: '📒', label: 'Journal Entry', id: je?.accountingDocument || '—', detail: je ? `GL: ${je.glAccount}` : '', color: '#ec4899' },
      ];
      return wrap(
        <div className="flow-trace">
          {steps.map((s, i) => (
            <div key={i} className="flow-step">
              <span className="flow-icon">{s.icon}</span>
              <div>
                <span className="flow-label" style={{ color: s.color }}>{s.label}: </span>
                <strong>{s.id}</strong>
                {s.detail && <span className="flow-detail"> · {s.detail}</span>}
              </div>
            </div>
          ))}
          {items?.length > 0 && (
            <>
              <div style={{ marginTop: 10, marginBottom: 4, fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Line Items
              </div>
              <Table headers={['Material', 'Qty', 'Amount (₹)']} rows={
                items.map(i => (
                  <tr key={i.id}>
                    <td className="mono">{i.material}</td>
                    <td>{i.quantity}</td>
                    <td>₹{(i.netAmount || 0).toLocaleString()}</td>
                  </tr>
                ))
              } />
            </>
          )}
        </div>
      );
    }

    case 'broken_flows':
      return wrap(
        <>
          <div style={{ marginBottom: 8, fontSize: 11, color: 'var(--text3)', lineHeight: 1.8 }}>
            <span style={{ color: '#ef4444', fontWeight: 600 }}>{result.totalCancelled}</span> cancelled invoices ·{' '}
            <span style={{ color: '#f59e0b', fontWeight: 600 }}>{result.totalUnpaid}</span> unpaid invoices ·{' '}
            <span style={{ color: '#f59e0b', fontWeight: 600 }}>{result.totalOrdersNoDelivery}</span> orders without delivery ·{' '}
            <span style={{ color: '#f59e0b', fontWeight: 600 }}>{result.totalDeliveriesNoBilling}</span> deliveries not billed
          </div>

          {result.ordersNoDelivery?.length > 0 && (
            <>
              <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Orders Without Delivery</div>
              <Table headers={['Order', 'Customer', 'Date']} rows={
                result.ordersNoDelivery.map(o => (
                  <tr key={o.id}>
                    <td className="mono">{o.id}</td>
                    <td>{o.customerId}</td>
                    <td>{o.date}</td>
                  </tr>
                ))
              } />
            </>
          )}

          {result.deliveriesNoBilling?.length > 0 && (
            <>
              <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 10, marginBottom: 4 }}>Deliveries Not Billed</div>
              <Table headers={['Delivery', 'Status', 'Items']} rows={
                result.deliveriesNoBilling.map(d => (
                  <tr key={d.id}>
                    <td className="mono">{d.id}</td>
                    <td>{d.overallStatus || '—'}</td>
                    <td>{d.itemCount}</td>
                  </tr>
                ))
              } />
            </>
          )}

          {result.unpaidInvoices?.length > 0 && (
            <>
              <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 10, marginBottom: 4 }}>Unpaid Invoices</div>
              <Table headers={['Billing Doc', 'Customer', 'Amount (₹)']} rows={
                result.unpaidInvoices.map(i => (
                  <tr key={i.id}>
                    <td className="mono">{i.id}</td>
                    <td>{i.customerId}</td>
                    <td>₹{(i.amount || 0).toLocaleString()}</td>
                  </tr>
                ))
              } />
            </>
          )}

          {result.cancelledInvoices?.length > 0 && (
            <>
              <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 10, marginBottom: 4 }}>Cancelled Invoices (sample)</div>
              <Table headers={['Billing Doc', 'Customer', 'Amount (₹)']} rows={
                result.cancelledInvoices.map(i => (
                  <tr key={i.id}>
                    <td className="mono">{i.id}</td>
                    <td>{i.customerId}</td>
                    <td>₹{(i.amount || 0).toLocaleString()}</td>
                  </tr>
                ))
              } />
            </>
          )}
        </>
      );

    case 'customer_summary':
      return wrap(
        <Table headers={['Customer', 'City', 'Orders', 'Invoices', 'Cancelled', 'Revenue (₹)', 'Paid (₹)']} rows={
          (result || []).map(c => (
            <tr key={c.id}>
              <td>{c.name || c.id}</td>
              <td>{c.city || '—'}</td>
              <td>{c.orderCount}</td>
              <td>{c.invoiceCount}</td>
              <td>{c.cancelledCount}</td>
              <td>₹{(c.totalRevenue || 0).toLocaleString()}</td>
              <td>₹{(c.paidAmount || 0).toLocaleString()}</td>
            </tr>
          ))
        } />
      );

    case 'cancelled_invoices':
      return wrap(
        <Table headers={['Billing Doc', 'Customer', 'Amount (₹)', 'Date']} rows={
          (result || []).map(i => (
            <tr key={i.id}>
              <td className="mono">{i.id}</td>
              <td>{i.customer?.name || i.customerId}</td>
              <td>₹{(i.amount || 0).toLocaleString()}</td>
              <td>{i.date}</td>
            </tr>
          ))
        } />
      );

    case 'all_orders':
      return wrap(
        <Table headers={['Order', 'Customer', 'Date', 'Items', 'Delivery', 'Billed']} rows={
          (result || []).map(o => (
            <tr key={o.id}>
              <td className="mono">{o.id}</td>
              <td>{o.customer?.name || o.customerId}</td>
              <td>{o.date}</td>
              <td>{o.itemCount}</td>
              <td>{o.hasDelivery ? '✓' : '✗'}</td>
              <td>{o.hasBilling ? '✓' : '✗'}</td>
            </tr>
          ))
        } />
      );

    case 'revenue_by_customer':
      return wrap(
        <Table headers={['Customer', 'City', 'Revenue (₹)']} rows={
          (result || []).map(r => (
            <tr key={r.customerId}>
              <td>{r.name}</td>
              <td>{r.city || '—'}</td>
              <td>₹{(r.revenue || 0).toLocaleString()}</td>
            </tr>
          ))
        } />
      );

    case 'payment_summary':
      return wrap(
        <>
          <div className="flow-trace" style={{ marginBottom: 10 }}>
            <div className="flow-step">
              <span className="flow-icon">💳</span>
              <div>
                <span className="flow-label" style={{ color: '#f97316' }}>Total Payments: </span>
                <strong>{result.totalPayments}</strong>
                <span className="flow-detail"> · ₹{(result.totalPaid || 0).toLocaleString()}</span>
              </div>
            </div>
            <div className="flow-step">
              <span className="flow-icon">⚠️</span>
              <div>
                <span className="flow-label" style={{ color: '#ef4444' }}>Unpaid Invoices: </span>
                <strong>{result.unpaidInvoices}</strong>
                <span className="flow-detail"> · ₹{(result.totalUnpaid || 0).toLocaleString()} outstanding</span>
              </div>
            </div>
          </div>
          <Table headers={['Accounting Doc', 'Amount (₹)', 'Clearing Date']} rows={
            (result.recentPayments || []).map(p => (
              <tr key={p.id}>
                <td className="mono">{p.accountingDocument}</td>
                <td>₹{Math.abs(p.amount || 0).toLocaleString()}</td>
                <td>{p.clearingDate || '—'}</td>
              </tr>
            ))
          } />
        </>
      );

    case 'delivery_summary':
      return wrap(
        <Table headers={['Delivery', 'Goods Date', 'Items', 'Billed', 'Orders']} rows={
          (result || []).map(d => (
            <tr key={d.id}>
              <td className="mono">{d.id}</td>
              <td>{d.goodsMovementDate || '—'}</td>
              <td>{d.itemCount}</td>
              <td>{d.isBilled ? '✓' : '✗'}</td>
              <td>{d.salesOrderCount}</td>
            </tr>
          ))
        } />
      );

    default:
      return <p>{narrative}</p>;
  }
}

export default function ChatPanel() {
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: (
      <p>Hello! Ask me anything about the <strong>SAP O2C supply chain dataset</strong> — sales orders, deliveries, billing documents, payments, and customers.</p>
    ),
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (query) => {
    const q = (query || input).trim();
    if (!q || loading) return;
    setInput('');

    setMessages(m => [
      ...m,
      { role: 'user', content: q, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
      { role: 'assistant', content: <span className="thinking">⟳ Translating query…</span>, timestamp: '', thinking: true },
    ]);
    setLoading(true);

    try {
      const { intent, params, narrative } = await askGroq(q);
      const cleanIntent = intent?.split(':')?.[0];
      const docId = intent?.includes(':') ? intent.split(':')[1] : params?.docId;
      const result = executeQuery(cleanIntent, { ...params, docId });
      const content = formatResult(cleanIntent, result, narrative);

      setMessages(m => [
        ...m.filter(msg => !msg.thinking),
        { role: 'assistant', content, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
      ]);
    } catch (err) {
      setMessages(m => [
        ...m.filter(msg => !msg.thinking),
        { role: 'assistant', content: <p className="error-text">Error: {err.message}</p>, timestamp: '' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-panel">
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`msg msg-${msg.role}`}>
            <div className="msg-bubble">{msg.content}</div>
            {msg.timestamp && <div className="msg-time">{msg.timestamp}</div>}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="suggestions">
        {SUGGESTIONS.map((s, i) => (
          <button key={i} className="chip" onClick={() => send(s)} disabled={loading}>{s}</button>
        ))}
      </div>

      <div className="chat-input-area">
        <textarea
          className="chat-input"
          placeholder="Ask about orders, deliveries, billing, payments…"
          value={input}
          rows={1}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
        />
        <button className="send-btn" onClick={() => send()} disabled={loading || !input.trim()}>
          {loading ? '…' : '↑'}
        </button>
      </div>
    </div>
  );
}