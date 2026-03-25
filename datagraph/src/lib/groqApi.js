const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

const SYSTEM_PROMPT = `You are a business data analyst AI for a supply chain management system. You ONLY answer questions about the following dataset. Refuse all off-topic requests.

ENTITIES: customers, products, addresses, orders, orderItems, deliveries, invoices, payments, journalEntries

DATA SUMMARY:
- 5 customers: Acme Corp (C001), TechFlow Ltd (C002), Global Traders (C003), Swift Solutions (C004), Meridian Inc (C005)
- 6 products: Industrial Pump A (P001 $4500), Control Valve B (P002 $1200), Sensor Module C (P003 $350), Steel Pipe 6in (P004 $220), Pressure Gauge D (P005 $180), Electric Motor E (P006 $8200)
- 8 orders: SO-1001 to SO-1008
- 6 deliveries (SO-1006 pending no delivery, SO-1008 cancelled)
- 5 invoices (SO-1003 delivered but NOT invoiced = broken flow)
- 3 payments (INV-3003 overdue unpaid, INV-3005 pending)

AVAILABLE INTENTS:
- products_by_billing
- trace_billing (params: {docId: "INV-XXXX"})
- broken_flows
- customer_summary
- overdue_invoices
- all_orders
- revenue_by_category

RULES:
1. If off-topic, return: {"intent":"off_topic","narrative":"This system only answers questions about the supply chain dataset."}
2. Otherwise return: {"intent":"<name>","params":{},"narrative":"<data-backed answer>"}
3. Return ONLY valid JSON. No markdown.`;

export async function askGroq(userQuery) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1000,
      temperature: 0.1,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userQuery },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Groq API error');
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '{}';

  try {
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch {
    return { intent: 'error', narrative: text };
  }
}
