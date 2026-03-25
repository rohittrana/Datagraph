import { useState } from 'react';
import GraphView from './components/GraphView';
import ChatPanel from './components/ChatPanel';
import SchemaPanel from './components/SchemaPanel';
import './App.css';

export default function App() {
  const [tab, setTab] = useState('chat');

  return (
    <div className="app">
      <header className="header">
        <div className="header-logo">
          <span className="logo-dot" />
          <h1>Data<span className="accent">Graph</span></h1>
        </div>
        <div className="header-stats">
          <span>47 nodes</span>
          <span className="sep">·</span>
          <span>54 edges</span>
          <span className="sep">·</span>
          <span>9 entity types</span>
          <span className="sep">·</span>
          <span>Supply Chain Dataset</span>
        </div>
      </header>

      <main className="main">
        <GraphView />

        <aside className="right-panel">
          <div className="panel-tabs">
            <button className={`tab ${tab === 'chat' ? 'active' : ''}`} onClick={() => setTab('chat')}>
              Query
            </button>
            <button className={`tab ${tab === 'schema' ? 'active' : ''}`} onClick={() => setTab('schema')}>
              Schema
            </button>
          </div>

          {tab === 'chat' ? <ChatPanel /> : <SchemaPanel />}
        </aside>
      </main>
    </div>
  );
}
