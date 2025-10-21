

export default function ResultsCard({ analysis, loading }) {
  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(analysis); } catch {}
  };
  const handleDownload = () => {
    const blob = new Blob([analysis || ''], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'analysis.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 text-center">
        <p className="text-gray-400">Analyzing financial data... Please wait.</p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 text-center">
        <p className="text-gray-500">Your financial analysis will appear here.</p>
      </div>
    );
  }

  return (
    <section className="bg-gray-800 p-6 rounded-lg border border-gray-700">
      <div className="flex items-start justify-between">
        <h2 className="text-2xl font-bold mb-4 text-cyan-400">Analysis Result</h2>
        <div className="flex gap-2">
          <button onClick={handleCopy} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm">Copy</button>
          <button onClick={handleDownload} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm">Download</button>
        </div>
      </div>

      <pre className="whitespace-pre-wrap font-mono text-gray-300 text-sm leading-relaxed max-h-[48vh] overflow-auto">
        {analysis}
      </pre>
    </section>
  );
}
