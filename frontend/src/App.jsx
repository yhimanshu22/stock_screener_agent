import { useState, useEffect } from 'react';
import ResultsCard from './components/ResultsCard';
import HistoryList from './components/HistoryList';
import { queryAgent } from './api/agentApi';

// Main App Component (improved)
const App = () => {
  const [query, setQuery] = useState('Give me a summary of AAPL and its recent news.');
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);

  // load history from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('screener_history_v1');
      if (raw) setHistory(JSON.parse(raw));
    } catch {}
  }, []);

  const pushHistory = (entry) => {
    const next = [entry, ...history].slice(0, 30);
    setHistory(next);
    try { localStorage.setItem('screener_history_v1', JSON.stringify(next)); } catch {}
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!query.trim()) {
      setError('Please enter a query.');
      return;
    }

    setLoading(true);
    setError('');
    setAnalysis('');

    try {
      const res = await queryAgent(query);
      if (!res.ok) throw new Error(res.error || 'agent error');

      // Ensure analysis is a string before passing to React components
      let content = res.content ?? res.raw ?? '';
      if (typeof content === 'object') {
        try {
          content = JSON.stringify(content, null, 2);
        } catch {
          content = String(content);
        }
      }

      setAnalysis(content);
      pushHistory({ id: Date.now(), query, result: content, ts: new Date().toISOString() });
    } catch (err) {
      setError(err.message || 'Failed to get analysis.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecall = (item) => {
    setQuery(item.query);
    setAnalysis(item.result);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-extrabold text-cyan-400">Stock Screener AI Agent</h1>
          <p className="text-gray-400 mt-2">LangGraph + FastAPI + React</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 space-y-4">
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g., Compare market cap of TSLA and GOOGL"
                className="flex-grow bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 text-white font-semibold px-5 py-3 rounded-lg shadow"
              >
                {loading ? 'Analyzing…' : 'Get Analysis'}
              </button>
            </form>

            {error && (
              <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg">
                <strong className="font-bold">Error:</strong> <span>{error}</span>
              </div>
            )}

            <ResultsCard analysis={analysis} loading={loading} />
          </section>

          <aside className="space-y-4">
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <h3 className="text-lg font-semibold text-cyan-300 mb-2">History</h3>
              <HistoryList items={history} onRecall={handleRecall} onClear={() => { setHistory([]); localStorage.removeItem('screener_history_v1'); }} />
            </div>

            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 text-sm text-gray-300">
              <h4 className="font-semibold text-cyan-300 mb-1">Tips</h4>
              <ul className="list-disc pl-5 space-y-1">
                <li>Be explicit: "Top dividend stocks with market cap & dividend yield".</li>
                <li>For structured output ask "Return JSON with fields: ticker, score, reason".</li>
              </ul>
            </div>
          </aside>
        </div>

        <footer className="text-center mt-8 text-gray-500 text-sm">
          <p>SelfProject | Aug 2025 - Present</p>
        </footer>
      </div>
    </div>
  );
};

export default App;

