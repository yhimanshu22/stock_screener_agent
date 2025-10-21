
export default function HistoryList({ items = [], onRecall = () => {}, onClear = () => {} }) {
  if (!items.length) {
    return <div className="text-gray-400">No recent queries.</div>;
  }

  return (
    <div className="space-y-2">
      <ul className="max-h-64 overflow-auto">
        {items.map((it) => (
          <li key={it.id} className="p-2 rounded hover:bg-gray-700 cursor-pointer flex justify-between items-start">
            <div onClick={() => onRecall(it)} className="flex-1 pr-2">
              <div className="text-sm text-gray-200 font-medium truncate">{it.query}</div>
              <div className="text-xs text-gray-400">{new Date(it.ts).toLocaleString()}</div>
            </div>
            <div className="flex flex-col gap-1">
              <button onClick={() => onRecall(it)} className="text-xs px-2 py-1 bg-cyan-600 rounded">Load</button>
            </div>
          </li>
        ))}
      </ul>

      <div className="pt-2">
        <button onClick={onClear} className="text-xs text-red-400 hover:underline">Clear history</button>
      </div>
    </div>
  );
}
