import React from 'react';
import { motion } from 'framer-motion';

export const DebateTimeline = ({ timeline }) => {
  if (!timeline || timeline.length === 0) return null;

  return (
    <div className="bg-card-dark rounded-xl border border-border-subtle p-6 mb-6">
      <h3 className="text-lg font-bold text-white mb-6">Debate Timeline</h3>
      
      <div className="relative border-l border-border-subtle ml-3 space-y-6">
        {timeline.map((event, index) => (
          <motion.div 
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative pl-6"
          >
            {/* Timeline dot */}
            <div className="absolute left-[-5px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-bg-dark" />
            
            <div className="flex flex-col">
              <span className="text-xs font-bold text-primary-bright uppercase tracking-widest mb-1">
                {event.type.replace('_', ' ')}
              </span>
              <h4 className="text-sm font-bold text-white">{event.title}</h4>
              {event.description && (
                <p className="text-xs text-text-muted mt-1">{event.description}</p>
              )}
              <span className="text-[10px] text-text-muted/70 mt-2">
                {new Date(event.timestamp).toLocaleString()}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
