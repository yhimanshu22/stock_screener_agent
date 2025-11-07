import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Loader2, Circle } from "lucide-react";

const FeedbackSteps = ({ steps = [], activeStep = 0 }) => {
  const [visible, setVisible] = useState(true);

  // Auto-hide after completion (2s delay)
  useEffect(() => {
    if (activeStep >= steps.length && steps.length > 0) {
      const timer = setTimeout(() => setVisible(false), 2000);
      return () => clearTimeout(timer);
    } else {
      setVisible(true);
    }
  }, [activeStep, steps.length]);

  if (!steps || steps.length === 0 || !visible) return null;

  // Parse & normalize step data
  const parsedSteps = steps.map((s, i) => {
    try {
      if (typeof s === "string") {
        const parsed = JSON.parse(s);
        return {
          stage: parsed.stage || `Step ${i + 1}`,
          detail: parsed.detail || s,
        };
      } else if (typeof s === "object") {
        return {
          stage: s.stage || `Step ${i + 1}`,
          detail: s.detail || JSON.stringify(s),
        };
      } else {
        return { stage: `Step ${i + 1}`, detail: String(s) };
      }
    } catch {
      return { stage: `Step ${i + 1}`, detail: String(s) };
    }
  });

  const progress =
    steps.length > 0
      ? Math.min(((activeStep + 1) / parsedSteps.length) * 100, 100)
      : 0;

  return (
    <AnimatePresence>
      <motion.div
        key="feedback-steps"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.4 }}
        className="p-5 bg-white border border-gray-200 rounded-2xl shadow-md transition-all relative overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            ⚙️ Processing Steps
          </h2>
          <span className="text-xs font-medium text-gray-500">
            {activeStep < steps.length
              ? `Step ${activeStep + 1} of ${steps.length}`
              : "✅ Completed"}
          </span>
        </div>

        {/* Step list */}
        <ul className="space-y-3">
          {parsedSteps.map((step, index) => {
            const isCompleted = index < activeStep;
            const isActive = index === activeStep;

            return (
              <motion.li
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-start space-x-3 p-2 rounded-lg ${isActive
                    ? "bg-blue-50 border border-blue-100"
                    : isCompleted
                      ? "bg-green-50 border border-green-100"
                      : "bg-gray-50"
                  }`}
              >
                <div className="mt-1">
                  {isCompleted ? (
                    <CheckCircle className="text-green-500 w-5 h-5" />
                  ) : isActive ? (
                    <Loader2 className="text-blue-500 w-5 h-5 animate-spin" />
                  ) : (
                    <Circle className="text-gray-300 w-5 h-5" />
                  )}
                </div>

                <div>
                  <p
                    className={`font-medium ${isCompleted
                        ? "text-green-700"
                        : isActive
                          ? "text-blue-600"
                          : "text-gray-700"
                      }`}
                  >
                    {step.stage}
                  </p>
                  <p className="text-sm text-gray-500">{step.detail}</p>
                </div>
              </motion.li>
            );
          })}
        </ul>

        {/* Gradient progress bar */}
        <div className="mt-5 h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className="h-2 bg-gradient-to-r from-blue-500 via-green-500 to-green-400"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6 }}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FeedbackSteps;
