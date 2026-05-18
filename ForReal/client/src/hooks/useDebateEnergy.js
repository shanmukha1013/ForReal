import { useMemo, useEffect, useState } from 'react';
import { ChatBubbleLeftRightIcon, ArrowTrendingUpIcon, BoltIcon, FireIcon } from '@heroicons/react/24/outline';

export const useDebateEnergy = (room, liveChatMessages = null) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    // Force a re-evaluation of momentum every 10 seconds for a live feel
    const interval = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(interval);
  }, []);

  return useMemo(() => {
    if (!room) {
      return { 
        score: 0, momentum: 0, level: 'calm', label: 'Calm', 
        icon: ChatBubbleLeftRightIcon, color: 'text-blue-400', 
        bg: 'bg-blue-400/10 border-blue-400/30' 
      };
    }

    let recentActivityScore = 0;
    const fiveMinsAgo = now - 5 * 60 * 1000;

    // 1. Participant Base (2 pts per debater, 1 pt per observer)
    const proCount = room.pro?.participants?.length || 0;
    const againstCount = room.against?.participants?.length || 0;
    const obsCount = room.observers?.length || 0;
    let score = (proCount + againstCount) * 2 + obsCount;

    // 2. Chat & Reactions Momentum
    const chats = liveChatMessages || room.chatMessages || [];
    chats.forEach(msg => {
      const msgTime = new Date(msg.createdAt).getTime();
      const isRecent = msgTime > fiveMinsAgo;
      
      const msgScore = 1;
      let reactionScore = 0;
      
      const reactionCount = (msg.likes?.length || 0) + (msg.dislikes?.length || 0) + (msg.agrees?.length || 0) + (msg.disagrees?.length || 0) + (msg.facts?.length || 0) + (msg.caps?.length || 0) + (msg.misleadings?.length || 0) + (msg.validPoints?.length || 0);
                            
      reactionScore += reactionCount * 2;

      if (isRecent) {
        recentActivityScore += 5 + reactionScore; // recent message carries heavy momentum
      } else {
        score += msgScore + reactionScore; // older messages just add to base score
      }
    });

    // 3. Votes / Verdicts
    const totalVotes = (room.votes?.pro || 0) + (room.votes?.against || 0) + (room.votes?.neutral || 0);
    score += totalVotes * 3;

    const finalScore = score + recentActivityScore;

    let config = { level: 'calm', label: 'Calm', icon: ChatBubbleLeftRightIcon, color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/30' };

    if (finalScore >= 120) {
      config = { level: 'explosive', label: 'Explosive', icon: FireIcon, color: 'text-red-500', bg: 'bg-red-500/20 border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.3)]' };
    } else if (finalScore >= 60) {
      config = { level: 'heated', label: 'Heated', icon: BoltIcon, color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/30 shadow-[0_0_10px_rgba(249,115,22,0.2)]' };
    } else if (finalScore >= 20) {
      config = { level: 'active', label: 'Active', icon: ArrowTrendingUpIcon, color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30' };
    }

    return { 
      score: finalScore, 
      momentum: recentActivityScore, 
      ...config 
    };
  }, [room, liveChatMessages, now]);
};