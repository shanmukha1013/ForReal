import { useState } from 'react';
import { motion } from 'framer-motion';
import { LinkIcon, DocumentTextIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function EvidenceUpload({ evidenceList, setEvidenceList }) {
  const [url, setUrl] = useState('');
  const [type, setType] = useState('website');

  const handleAdd = () => {
    if (!url.trim()) {return;}
    setEvidenceList([...evidenceList, { url: url.trim(), type }]);
    setUrl('');
  };

  const handleRemove = (idx) => {
    setEvidenceList(evidenceList.filter((_, i) => i !== idx));
  };

  return (
    <div className="mt-3 p-3 bg-white/5 border border-white/10 rounded-xl">
      <label className="block text-xs font-semibold text-gray-400 mb-2">Attach Evidence</label>
      
      <div className="flex gap-2 mb-3">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-brand text-xs focus:outline-none focus:border-brand/50"
        >
          <option value="website">URL</option>
          <option value="pdf">PDF</option>
          <option value="image">Image</option>
          <option value="video">Video</option>
        </select>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste link here..."
          className="flex-1 bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-brand text-xs focus:outline-none focus:border-brand/50"
        />
        <button
          onClick={handleAdd}
          disabled={!url.trim()}
          className="px-4 py-2 bg-brand/20 text-brand border border-brand/50 rounded-lg text-xs font-bold hover:bg-brand/30 transition disabled:opacity-50"
        >
          Add
        </button>
      </div>

      {evidenceList.length > 0 && (
        <div className="space-y-2">
          {evidenceList.map((ev, idx) => (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              key={idx}
              className="flex items-center justify-between bg-black/40 px-3 py-2 rounded-lg border border-white/5"
            >
              <div className="flex items-center gap-2 text-xs text-gray-300 truncate">
                {ev.type === 'pdf' ? (
                  <DocumentTextIcon className="w-4 h-4 text-red-400" />
                ) : ev.type === 'image' || ev.type === 'video' ? (
                  <PhotoIcon className="w-4 h-4 text-brand" />
                ) : (
                  <LinkIcon className="w-4 h-4 text-brand" />
                )}
                <span className="truncate">{ev.url}</span>
              </div>
              <button onClick={() => handleRemove(idx)} className="text-gray-500 hover:text-red-400 p-1">
                <XMarkIcon className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
