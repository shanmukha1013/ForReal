import { motion } from 'framer-motion';
import { TrophyIcon, ChartBarIcon, SparklesIcon } from '@heroicons/react/24/outline';

export default function DebateReport({ report, room }) {
  if (!report) {return null;}

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-black/60 backdrop-blur-xl border border-brand/30 rounded-2xl p-6 shadow-[0_0_20px_rgba(193,18,31,0.1)]"
    >
      <div className="flex items-center gap-2 mb-4">
        <SparklesIcon className="w-6 h-6 text-brand" />
        <h2 className="text-xl font-bold text-white">AI Final Verdict</h2>
      </div>

      <p className="text-gray-300 text-sm leading-relaxed mb-6">
        {report.aiSummary || 'The AI concluded that both sides made valid points, but the winning side presented more factual evidence.'}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-start gap-3">
          <TrophyIcon className="w-5 h-5 text-yellow-400 mt-0.5" />
          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Winning Argument</h4>
            <p className="text-white font-medium mt-1">{report.winningOption || 'N/A'}</p>
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-start gap-3">
          <ChartBarIcon className="w-5 h-5 text-blue-400 mt-0.5" />
          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Most Logical User</h4>
            <p className="text-white font-medium mt-1">@{report.mostLogicalUser || 'N/A'}</p>
          </div>
        </div>
      </div>
      
      {report.confidenceScore && (
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
          <span>AI Confidence</span>
          <div className="flex items-center gap-2">
            <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-brand" style={{ width: `${report.confidenceScore}%` }} />
            </div>
            <span className="text-brand">{report.confidenceScore}%</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
