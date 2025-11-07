import { useParams, useNavigate } from "react-router-dom";
import { Download, ArrowLeft } from "lucide-react";

export default function StockDetail({ data }) {
  const { symbol } = useParams();
  const navigate = useNavigate();

  const company = data?.results?.[0]?.company || {};
  const keyInfo = data?.results?.[0]?.key_information || {};
  const valuation = company.valuation || {};
  const news = data?.results?.[0]?.latest_news || [];

  if (!company.name) {
    return (
      <div className="text-center text-gray-500 mt-10">
        No data found for <strong>{symbol}</strong>.
      </div>
    );
  }

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(data || {}, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${symbol}_report.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#F9FAFC] py-10 px-4 flex flex-col items-center">
      <div className="max-w-4xl w-full bg-white border border-gray-200 rounded-2xl shadow-md p-6 relative">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-5 left-5 flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">
              {company.name} <span className="text-gray-500 text-xl">({company.symbol})</span>
            </h1>
            <p className="text-blue-600 text-sm">{keyInfo?.Website || "—"}</p>
            <p className="text-gray-500 text-xs">
              Sector: {company.sector || "—"} | Industry: {company.industry || "—"}
            </p>
          </div>
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-lg shadow"
          >
            <Download className="inline w-4 h-4 mr-1" /> Export JSON
          </button>
        </div>

        {/* Key Metrics Section */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-gray-50 rounded-xl p-5 border border-gray-100">
          <Metric label="Market Cap" value={keyInfo["Market Cap"] || "—"} />
          <Metric label="Current Price" value={keyInfo["Current Price"] || "—"} />
          <Metric label="Stock P/E" value={valuation.trailing_pe || "—"} />
          <Metric label="Book Value" value={keyInfo["Book Value"] || "—"} />
          <Metric label="ROE" value={keyInfo.ROE || company.performance?.roe || "—"} />
          <Metric label="Dividend Yield" value={`${valuation.dividend_yield || "—"}%`} />
        </div>

        {/* About Section */}
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">📘 About</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            {company.summary || data?.summary || "No company description available."}
          </p>
        </div>

        {/* Latest News Section */}
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">📰 Latest News</h2>
          {news.length === 0 ? (
            <p className="text-gray-500 text-sm">No recent news found.</p>
          ) : (
            <ul className="space-y-2">
              {news.map((n, i) => (
                <li
                  key={i}
                  className="border border-gray-100 rounded-lg p-3 bg-gray-50 hover:bg-gray-100 transition"
                >
                  <a
                    href={n.link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 font-medium hover:underline"
                  >
                    {n.title || "Untitled"}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-gray-400 italic mt-6">
          {data?.disclaimer || "Data fetched in real time. Not financial advice."}
        </p>
      </div>
    </div>
  );
}

// Small reusable component for metrics
const Metric = ({ label, value }) => (
  <div className="bg-white border border-gray-200 rounded-lg p-3 text-center shadow-sm">
    <p className="text-xs text-gray-500">{label}</p>
    <p className="text-base font-semibold text-gray-800 mt-1">{value}</p>
  </div>
);
