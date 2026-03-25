# DataGraph — SAP O2C Business Intelligence Explorer

A graph-based data modeling and conversational query system built on real SAP Order-to-Cash data.

---

## What It Does

- Visualizes SAP O2C entities as an interactive graph (D3.js force-directed)
- Lets users query the data in plain English via a chat interface
- Translates natural language to structured queries using Groq AI (Llama 3.3 70B)
- Returns data-backed answers grounded in the real dataset

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Graph | D3.js v7 (force-directed) |
| AI | Groq API (llama-3.3-70b-versatile) |
| Data | SAP O2C JSONL dataset |
| Styling | Plain CSS with CSS variables |

---

## Dataset

Real SAP Order-to-Cash data (`sap-o2c-data`):

| Entity | Count |
|---|---|
| Customers (Business Partners) | 8 |
| Sales Orders | 100 |
| Outbound Deliveries | 86 |
| Billing Documents | 163 (80 cancelled) |
| Billing Items | 245 |
| Payments | 120 |
| Journal Entries | 123 |
| Materials/Products | 55 |
| Plants | 44 |

---

## O2C Flow

```
Sales Order → Outbound Delivery → Billing Document → Payment → Journal Entry
```

---

## Example Queries

- "Show broken order flows" — orders without delivery, unpaid invoices
- "Trace billing document 90504248" — full O2C flow trace
- "Revenue by customer" — total billed revenue per customer
- "Which materials have most billing docs?" — ranked by frequency
- "Show cancelled invoices" — 80 cancelled billing documents
- "Payment summary" — paid vs unpaid breakdown

---

## Guardrails

Off-topic questions are rejected with:
"This system only answers questions about the SAP O2C supply chain dataset."

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Create .env file in root
echo "VITE_GROQ_API_KEY=your_key_here" > .env

# 3. Run locally
npm run dev

# 4. Build for production
npm run build
```

Get a free Groq API key at https://console.groq.com

---

## Project Structure

```
src/
├── data/
│   └── dataset.js          # Real SAP O2C data
├── lib/
│   ├── graphBuilder.js     # Builds nodes + edges
│   ├── queryEngine.js      # Structured query functions
│   └── groqApi.js          # Groq AI integration
└── components/
    ├── GraphView.jsx        # D3 force graph
    ├── ChatPanel.jsx        # Chat interface
    └── SchemaPanel.jsx      # Schema explorer
```

---

## Deployment

1. Run `npm run build`
2. Drag `dist/` folder to https://app.netlify.com/drop
3. Add `VITE_GROQ_API_KEY` in Netlify Site Settings → Environment Variables