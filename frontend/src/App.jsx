import { useState, useEffect } from "react";
import ResultsCard from "./components/ResultsCard";
import HistoryList from "./components/HistoryList";
import { queryAgent } from "./api/agentApi";
import FeedbackSteps from "./components/FeedbackSteps";

const App = () => {
  const [query, setQuery] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [activeStep, setActiveStep] = useState(0); // ✅ NEW

  // Load search history
  useEffect(() => {
    const raw = localStorage.getItem("screener_history_v1");
    if (raw) setHistory(JSON.parse(raw));
  }, []);

  const pushHistory = (entry) => {
    const next = [entry, ...history].slice(0, 30);
    setHistory(next);
    localStorage.setItem("screener_history_v1", JSON.stringify(next));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) {
      setError("Please enter a company name or query.");
      return;
    }

    setLoading(true);
    setError("");
    setData(null);
    setFeedback([]);
    setActiveStep(0); 

    try {
      const res = await queryAgent(query);
      if (!res.ok) throw new Error(res.error || "Agent error");

      const apiData = res.data?.data || res.data || res.content || null;
      const steps = apiData?.feedback_steps || [];

      setFeedback(steps);
      setActiveStep(0);

    
      steps.forEach((_, idx) => {
        setTimeout(() => {
          setActiveStep(idx + 1);
        }, (idx + 1) * 800);
      });

      setData(apiData);
      pushHistory({
        id: Date.now(),
        query,
        result: apiData,
        ts: new Date().toISOString(),
      });
    } catch (err) {
      setError(err.message || "Failed to get analysis.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFC] flex flex-col items-center justify-center text-gray-800 p-6">
      {/* Header */}
      <header className="absolute top-6 left-8 flex gap-8 text-gray-700 text-sm font-medium">
        <a href="#" className="hover:text-blue-600">Home</a>
        <a href="#" className="hover:text-blue-600">Screens</a>
        <a href="#" className="hover:text-blue-600">Tools ▾</a>
      </header>

      <div className="max-w-3xl w-full text-center mt-12">
        {/* Logo + tagline */}
        <h1 className="text-6xl font-extrabold text-gray-900 mb-2">
          screener<span className="text-green-500">AI</span>
        </h1>
        <p className="text-gray-500 mb-6">
          Stock analysis and screening tool powered by AI.
        </p>

        {/* Search Form */}
        <form onSubmit={handleSubmit} className="flex items-center justify-center gap-3">
          <div className="relative w-full max-w-xl">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="🔍 Search for a company or ask an AI question..."
              className="w-full border border-gray-300 rounded-lg px-5 py-3 shadow-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-green-500 hover:bg-green-600 text-white font-semibold px-5 py-3 rounded-lg transition"
          >
            {loading ? "Analyzing…" : "Search"}
          </button>
        </form>

        {/* Error Message */}
        {error && (
          <div className="mt-4 bg-red-100 text-red-600 border border-red-300 px-4 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Feedback Steps */}
        {feedback.length > 0 && (
          <div className="mt-6">
            <FeedbackSteps steps={feedback} activeStep={activeStep} />
            {!loading && activeStep >= feedback.length && (
              <p className="text-green-600 text-sm mt-2 font-medium">
                ✅ All steps completed successfully!
              </p>
            )}
          </div>
        )}

        {/* Results Section */}
        <div className="mt-10">
          <ResultsCard data={data} analysis={null} loading={loading} />
        </div>


        {/* Quick Examples */}
        <div className="mt-10 text-sm text-gray-500">
          <p className="mb-3">Or try analysing:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {["AAPL", "TSLA", "MSFT", "GOOGL", "NVDA"].map((ticker) => (
              <button
                key={ticker}
                onClick={() =>
                  setQuery(`Give me a summary of ${ticker} and its recent news.`)
                }
                className="px-3 py-1.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-100"
              >
                {ticker}
              </button>
            ))}
          </div>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="mt-12 bg-white rounded-xl shadow-md p-4 max-w-xl mx-auto">
            <h3 className="text-lg font-semibold mb-3 text-gray-700">Recent Searches</h3>
            <HistoryList
              items={history}
              onRecall={(item) => setQuery(item.query)}
            />
          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 text-gray-400 text-xs">
          <p>AI Stock Screener • Built with LangGraph + FastAPI + React</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
