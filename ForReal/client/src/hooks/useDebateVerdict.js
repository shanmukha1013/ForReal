import { useState, useEffect, useCallback } from 'react';
import { getVoteWeight, updateCredibility } from './useCredibility';

export const useDebateVerdict = (roomId, myId, myCredScore, room, summary) => {
  const [verdictData, setVerdictData] = useState({
    votes: {
      logical: { pro: [], against: [] },
      factual: { pro: [], against: [] },
      evidence: { pro: [], against: [] },
      constructive: { pro: [], against: [] }
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

  const castEvaluationVote = useCallback((category, side) => {
    if (!myId || verdictData.status === 'resolved') {return;}

    setVerdictData(prev => {
      const newVotes = { ...prev.votes };
      
      // Remove previous vote in this category by this user (prevent multi-voting)
      newVotes[category].pro = newVotes[category].pro.filter(v => v.userId !== myId);
      newVotes[category].against = newVotes[category].against.filter(v => v.userId !== myId);

      // Apply credibility-weighted vote
      const weight = getVoteWeight(myCredScore || 1000);
      newVotes[category][side].push({ userId: myId, weight });

      const newState = { ...prev, votes: newVotes };
      localStorage.setItem(`forreal_verdict_${roomId}`, JSON.stringify(newState));
      return newState;
    });
  }, [roomId, myId, myCredScore, verdictData.status]);

  const generateVerdict = useCallback(() => {
    if (verdictData.status === 'resolved') {return;}

    let proPoints = 0;
    let againstPoints = 0;

    // Sum credibility-weighted votes
    Object.keys(verdictData.votes).forEach(cat => {
       proPoints += verdictData.votes[cat].pro.reduce((sum, v) => sum + v.weight, 0);
       againstPoints += verdictData.votes[cat].against.reduce((sum, v) => sum + v.weight, 0);
    });

    // Factor in AI Consensus
    if (summary && summary.consensusLevel === 'High') {
       if (proPoints > againstPoints) {proPoints += 10;}
       else if (againstPoints > proPoints) {againstPoints += 10;}
    }

    let outcomeTitle = "No Clear Winner";
    let winner = "tie";
    let color = "text-gray-400";
    let bg = "bg-white/5 border-white/20";

    if (proPoints > againstPoints * 1.5) { outcomeTitle = "Community Consensus Reached"; winner = "pro"; color = "text-neon"; bg = "bg-neon/10 border-neon/30"; }
    else if (againstPoints > proPoints * 1.5) { outcomeTitle = "Factually Resolved"; winner = "against"; color = "text-red-400"; bg = "bg-red-400/10 border-red-400/30"; }
    else if (proPoints > againstPoints) { outcomeTitle = "Strongest Argument Identified (Pro)"; winner = "pro"; color = "text-neon"; bg = "bg-neon/10 border-neon/30"; }
    else if (againstPoints > proPoints) { outcomeTitle = "Strongest Argument Identified (Against)"; winner = "against"; color = "text-red-400"; bg = "bg-red-400/10 border-red-400/30"; }

    const outcome = { title: outcomeTitle, winner, proPoints, againstPoints, color, bg, resolvedAt: new Date().toISOString() };
    const newState = { ...verdictData, status: 'resolved', outcome };
    
    setVerdictData(newState);
    localStorage.setItem(`forreal_verdict_${roomId}`, JSON.stringify(newState));
  }, [roomId, verdictData, summary]);

  return { verdictData, castEvaluationVote, generateVerdict };
};