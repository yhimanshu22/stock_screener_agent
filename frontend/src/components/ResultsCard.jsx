import { Download, Copy } from "lucide-react";

export default function ResultsCard({ data, loading }) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data || "", null, 2));
    } catch {}
  };

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(data || "", null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "analysis.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Loading state
  if (loading) {
    return (
      <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm text-center">
        <p className="text-gray-500 animate-pulse">
          🔄 Fetching data… please wait.
        </p>
      </div>
    );
  }

  // Empty state
  if (!data) {
    return (
      <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm text-center text-gray-500">
        Your financial analysis will appear here.
      </div>
    );
  }

  const result = data?.results?.[0] || {};
  const company = result.company || {};
  const keyInfo = result.key_information || {};
  const news = result.recent_news || [];
  const disclaimer =
    data?.disclaimer ||
    "This data is AI-generated and should not be treated as financial advice.";

  return (
    <section className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
          📊 Stock Analysis
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition"
          >
            <Copy className="inline w-4 h-4 mr-1" /> Copy
          </button>
          <button
            onClick={handleDownload}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition"
          >
            <Download className="inline w-4 h-4 mr-1" /> Download
          </button>
        </div>
      </div>

      {/* Company Summary */}
      {company.name || keyInfo.Symbol ? (
        <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 mb-5">
          <h3 className="text-lg font-semibold text-gray-800 mb-1">
            {company.name || keyInfo["Company Name"]} ({company.symbol || keyInfo.Symbol})
          </h3>
          <p className="text-gray-600 text-sm">
            <strong>Sector:</strong> {company.sector || keyInfo.Sector || "—"} <br />
            <strong>Industry:</strong> {company.industry || keyInfo.Industry || "—"} <br />
            <strong>Market Cap:</strong> {keyInfo["Market Cap"]?.toLocaleString?.() || "—"}
          </p>
        </div>
      ) : null}

      {/* Key Information */}
      {Object.keys(keyInfo).length > 0 && (
        <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 mb-5">
          <h3 className="font-semibold text-gray-800 mb-3">📈 Key Information</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm text-gray-700">
            {Object.entries(keyInfo).map(([key, val]) => (
              <div key={key} className="bg-white border border-gray-200 rounded-md p-2 shadow-sm">
                <p className="font-medium text-gray-800">{key}</p>
                <p className="text-gray-600 break-words">
                  {String(val) || "—"}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Financial Metrics */}
      {company.valuation && (
        <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 mb-5">
          <h3 className="font-semibold text-gray-800 mb-3">💰 Valuation Metrics</h3>
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm text-gray-700">
            <li>Trailing P/E: {company.valuation.trailing_pe || "—"}</li>
            <li>Forward P/E: {company.valuation.forward_pe || "—"}</li>
            <li>Dividend Yield: {company.valuation.dividend_yield || "—"}%</li>
          </ul>
        </div>
      )}

      {/* Recent News */}
      <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 mb-5">
        <h3 className="font-semibold text-gray-800 mb-3">📰 Latest News</h3>
        {news.length === 0 ? (
          <p className="text-gray-500 text-sm">No recent news available.</p>
        ) : (
          <ul className="space-y-3">
            {news.map((n, i) => (
              <li
                key={i}
                className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition"
              >
                <a
                  href={n.link || n.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 font-medium hover:underline"
                >
                  {n.title || "Untitled Article"}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Full Raw Data (Expandable for Debugging / Transparency) */}
      {Object.keys(data).length > 0 && (
        <details className="mt-4 bg-gray-50 border border-gray-100 rounded-lg p-4">
          <summary className="cursor-pointer text-gray-700 font-medium mb-2">
            🧩 View Full JSON Data
          </summary>
          <pre className="whitespace-pre-wrap font-mono text-gray-700 text-sm leading-relaxed overflow-x-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        </details>
      )}

      {/* Disclaimer */}
      <p className="text-xs text-gray-400 italic mt-4">{disclaimer}</p>
    </section>
  );
}
