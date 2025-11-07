import { motion, AnimatePresence } from "framer-motion";
import { Trash2 } from "lucide-react";

export default function HistoryList({
  items = [],
  onRecall = () => { },
  onClear = () => { },
}) {
  // Instantly clear history — no confirmation popup
  const handleClear = () => {
    localStorage.removeItem("screener_history_v1");
    onClear(); // tell parent to clear state
  };

  if (!items.length) {
    return (
      <div className="text-gray-400 text-sm text-center italic py-4">
        No recent searches yet.
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-3">
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-base font-semibold text-gray-700">
          Recent Searches
        </h3>
        <button
          onClick={handleClear}
          className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 hover:underline transition"
        >
          <Trash2 className="w-3.5 h-3.5" /> Clear
        </button>
      </div>

      {/* History Items */}
      <ul className="max-h-64 overflow-y-auto divide-y divide-gray-100">
        <AnimatePresence>
          {items.map((it) => (
            <motion.li
              key={it.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
              className="p-3 rounded-lg hover:bg-gray-50 transition flex justify-between items-start group cursor-pointer"
              onClick={() => onRecall(it)}
            >
              <div className="flex-1">
                <p className="text-gray-800 font-medium text-sm truncate group-hover:text-green-600 transition">
                  {it.query}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(it.ts).toLocaleString()}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRecall(it);
                }}
                className="text-xs px-3 py-1 border border-gray-300 rounded-lg hover:bg-green-50 hover:border-green-400 text-green-700 font-medium transition"
              >
                Load
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}
