import { useState, useContext } from 'react';
import { motion } from 'framer-motion';
import { Zap, Plus, X } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { useNotification } from './Notification';
import axios from '../api/axios';

const createPanelVariant = {
  hidden: { opacity: 0, height: 0 },
  visible: { opacity: 1, height: 'auto', transition: { duration: 0.3 } },
};

export default function CreateDebateForm({ onCreate, optimisticCreateRoom, confirmRoom, deleteRoom }) {
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [anonymityMode, setAnonymityMode] = useState('hybrid');
  const [debateMode, setDebateMode] = useState('Open Discussion');
  const [duration, setDuration] = useState('3600'); // default 1 hr
  const [customOptions, setCustomOptions] = useState(['', '']); // Start with 2 empty options
  
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const { user } = useContext(AuthContext);
  const notify = useNotification();

  const canCreate = topic.trim().length >= 6;

  const handleAddOption = () => setCustomOptions([...customOptions, '']);
  const handleRemoveOption = (idx) => setCustomOptions(customOptions.filter((_, i) => i !== idx));
  const handleOptionChange = (idx, val) => {
    const newOpts = [...customOptions];
    newOpts[idx] = val;
    setCustomOptions(newOpts);
  };

  const handleCreate = async () => {
    if (!canCreate || creating) {return;}
    setCreating(true);
    setError('');
    
    const trimmedTopic = topic.trim();
    const trimmedDescription = description.trim();
    const validOptions = customOptions.map(opt => opt.trim()).filter(Boolean);

    if (debateMode !== 'Open Discussion' && validOptions.length < 2) {
      setError('Custom debates require at least 2 options.');
      setCreating(false);
      return;
    }

    const newRoom = {
      _id: `room_${Date.now()}`,
      topic: trimmedTopic,
      description: trimmedDescription,
      category: category || 'Uncategorized',
      visibility,
      anonymityMode,
      debateMode,
      status: 'active',
      creator: user || { username: 'Guest' },
      participants: 1,
      spectators: 0,
      createdAt: new Date().toISOString(),
      customOptions: validOptions.map(opt => ({ name: opt, participants: [], score: 0 })),
      observers: [],
      chatMessages: [],
    };

    let optimisticRoom = null;
    try {
      optimisticRoom = optimisticCreateRoom(newRoom);
      if (onCreate) {onCreate(optimisticRoom);}
      notify.success('Debate room created!');

      const payload = {
        title: trimmedTopic,
        description: trimmedDescription,
        category: category || undefined,
        visibility,
        isPrivate: visibility === 'private',
        debateMode,
        customOptions: validOptions,
        duration: parseInt(duration, 10),
      };

      const result = await axios.post('/rooms', payload);
      const realRoom = result?.room || result?.data?.room || null;
      if (realRoom) {
        confirmRoom(optimisticRoom._id, realRoom);
      } else {
        deleteRoom(optimisticRoom._id);
        notify.error('Failed to create room on server');
      }
    } catch (err) {
      if (optimisticRoom) {
        try { deleteRoom(optimisticRoom._id); } catch (e) {}
      }
      notify.error(err?.response?.data?.message || 'Unable to create room');
    } finally {
      setTopic('');
      setDescription('');
      setCategory('');
      setVisibility('public');
      setDebateMode('Open Discussion');
      setCustomOptions(['', '']);
      setCreating(false);
    }
  };

  return (
    <motion.div
      variants={createPanelVariant}
      initial="hidden"
      animate="visible"
      exit="hidden"
      className="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden mb-6"
    >
      <div className="p-5">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-[#C1121F]" /> Start a Debate
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Debate topic (min. 6 characters)"
            className="bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50 transition text-sm"
          />
          <select
            value={debateMode}
            onChange={(e) => setDebateMode(e.target.value)}
            className="bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500/50 text-sm"
          >
            <option value="Open Discussion">Open Discussion</option>
            <option value="Multiple Choice">Multiple Choice Debate</option>
            <option value="Prediction">Prediction</option>
            <option value="AI Judged Debate">AI Judged Debate</option>
          </select>
        </div>

        {debateMode !== 'Open Discussion' && (
          <div className="mb-4 p-4 border border-white/10 rounded-xl bg-white/5">
            <label className="block text-xs font-semibold text-gray-400 mb-2">Custom Options</label>
            <div className="space-y-2">
              {customOptions.map((opt, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    placeholder={`Option ${idx + 1}`}
                    className="flex-1 bg-black/60 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50 text-sm"
                  />
                  {customOptions.length > 2 && (
                    <button onClick={() => handleRemoveOption(idx)} className="text-red-400 hover:text-red-300 p-2">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button onClick={handleAddOption} className="mt-3 flex items-center gap-1 text-xs text-green-400 hover:text-green-300">
              <Plus className="w-3 h-3" /> Add Option
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500/50 text-sm"
          >
            <option value="">No category</option>
            <option value="Politics">Politics</option>
            <option value="Technology">Technology</option>
            <option value="Sports">Sports</option>
            <option value="Entertainment">Entertainment</option>
          </select>
          <select
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500/50 text-sm"
          >
            <option value="600">10 Minutes</option>
            <option value="3600">1 Hour</option>
            <option value="21600">6 Hours</option>
            <option value="86400">24 Hours</option>
          </select>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
            className="bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500/50 text-sm"
          >
            <option value="public">🌍 Public</option>
            <option value="private">🔒 Private</option>
          </select>
        </div>
        
        {error && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-xs mb-2">
            {error}
          </motion.p>
        )}

        <div className="flex justify-end mt-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={!canCreate || creating}
            onClick={handleCreate}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-green-500 text-white font-bold text-sm disabled:opacity-50 transition shadow-lg shadow-green-500/20"
          >
            {creating ? 'Creating...' : 'Create Debate'}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
