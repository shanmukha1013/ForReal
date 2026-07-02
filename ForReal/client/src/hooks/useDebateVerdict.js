import { useState, useEffect, useCallback } from 'react';
import { getVoteWeight } from './useCredibility';

export const useDebateVerdict = (roomId, myId, myCredScore, room, summary) => {
  const [verdictData, setVerdictData] = useState({
    votes: {
      logical: {},
      factual: {},
      evidence: {},
      constructive: {}
    },
    status: 'ongoing', // 'ongoing', 'resolved'
    outcome: null
  });

  // Load persisted verdict state
  useEffect(() => {
    if (!roomId) {return;}
    const stored = localStorage.getItem(`forreal_verdict_${roomId}`);
    if (stored) {
      try { setVerdictData(JSON.parse(stored)); } catch (e) { console.warn('useDebateVerdict: failed to parse stored verdict', e); }
    }
  }, [roomId]);

  const castEvaluationVote = useCallback((category, optionName) => {
    if (!myId || verdictData.status === 'resolved') {return;}

    setVerdictData(prev => {
      const newVotes = { ...prev.votes };
      
      // Initialize if needed
      if (!newVotes[category]) {newVotes[category] = {};}
      
      // Remove previous vote in this category by this user across all options (prevent multi-voting)
      Object.keys(newVotes[category]).forEach(opt => {
        newVotes[category][opt] = (newVotes[category][opt] || []).filter(v => v.userId !== myId);
      });

      if (!newVotes[category][optionName]) {
        newVotes[category][optionName] = [];
      }

      // Apply credibility-weighted vote
      const weight = getVoteWeight(myCredScore || 1000);
      newVotes[category][optionName].push({ userId: myId, weight });

      const newState = { ...prev, votes: newVotes };
      localStorage.setItem(`forreal_verdict_${roomId}`, JSON.stringify(newState));
      return newState;
    });
  }, [roomId, myId, myCredScore, verdictData.status]);

  const generateVerdict = useCallback(() => {
    if (verdictData.status === 'resolved' || !room?.customOptions) {return;}

    const points = {};
    room.customOptions.forEach(opt => {
      points[opt.name] = 0;
    });

    // Sum credibility-weighted votes
    Object.keys(verdictData.votes).forEach(cat => {
       Object.keys(verdictData.votes[cat] || {}).forEach(optName => {
         if (points[optName] !== undefined) {
           points[optName] += (verdictData.votes[cat][optName] || []).reduce((sum, v) => sum + v.weight, 0);
         }
       });
    });

    // Factor in AI Consensus
    if (summary && summary.consensusLevel === 'High' && summary.winningOption) {
       if (points[summary.winningOption] !== undefined) {
          points[summary.winningOption] += 10;
       }
    }

    // Determine winner
    let winner = null;
    let highestPoints = -1;
    let isTie = false;

    Object.entries(points).forEach(([optName, pts]) => {
       if (pts > highestPoints) {
          highestPoints = pts;
          winner = optName;
          isTie = false;
       } else if (pts === highestPoints) {
          isTie = true;
       }
    });

    let outcomeTitle = "No Clear Winner";
    let color = "text-gray-400";
    let bg = "bg-white/5 border-white/20";

    if (!isTie && highestPoints > 0) {
       outcomeTitle = `Community Verdict: ${winner}`;
       color = "text-brand";
       bg = "bg-brand/10 border-brand/30";
    }

    const outcome = { title: outcomeTitle, winner: isTie ? 'tie' : winner, points, color, bg, resolvedAt: new Date().toISOString() };
    const newState = { ...verdictData, status: 'resolved', outcome };
    
    setVerdictData(newState);
    localStorage.setItem(`forreal_verdict_${roomId}`, JSON.stringify(newState));
  }, [roomId, verdictData, summary, room]);

  return { verdictData, castEvaluationVote, generateVerdict };
};