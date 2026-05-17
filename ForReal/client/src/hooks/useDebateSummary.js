import { useState, useEffect, useCallback } from 'react';

export const useDebateSummary = (roomId, chatMessages, timelineEvents, energy) => {
  const [summary, setSummary] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Load persisted summary
  useEffect(() => {
    if (!roomId) return;
    const local = localStorage.getItem(`forreal_summary_${roomId}`);
    if (local) {
      try { setSummary(JSON.parse(local)); } catch (e) {}
    }
  }, [roomId]);

  const generateAnalysis = useCallback(async () => {
    if (!chatMessages || chatMessages.length === 0) return;
    setIsAnalyzing(true);

    // Simulate Semantic AI / LLM Processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 1. Find Most Influential Participant
    const participantScores = {};
    chatMessages.forEach(msg => {
        const author = msg.sender?.username || 'anonymous';
        const impact = (msg.likes?.length || 0) + (msg.agrees?.length || 0) + (msg.validPoints?.length || 0) + (msg.facts?.length || 0);
        participantScores[author] = (participantScores[author] || 0) + impact;
    });
    const topContributor = Object.entries(participantScores).sort((a,b) => b[1] - a[1])[0]?.[0] || 'Pending activity';

    // 2. Extract Strongest Arguments
    const sortedByPositive = [...chatMessages].sort((a,b) => {
        const aPos = (a.likes?.length||0) + (a.agrees?.length||0) + (a.validPoints?.length||0) + (a.facts?.length||0);
        const bPos = (b.likes?.length||0) + (b.agrees?.length||0) + (b.validPoints?.length||0) + (b.facts?.length||0);
        return bPos - aPos;
    });
    const strongestArg = sortedByPositive[0]?.text || "Not enough data to extract a prevailing argument.";

    // 3. Extract Most Disputed Claim
    const sortedByNegative = [...chatMessages].sort((a,b) => {
        const aNeg = (a.disagrees?.length||0) + (a.caps?.length||0) + (a.misleadings?.length||0) + (a.dislikes?.length||0);
        const bNeg = (b.disagrees?.length||0) + (b.caps?.length||0) + (b.misleadings?.length||0) + (b.dislikes?.length||0);
        return bNeg - aNeg;
    });
    const mostDisputed = sortedByNegative[0]?.text || "No major disputes or misleading claims detected yet.";

    // 4. Calculate Consensus Level
    let consensusLevel = 'Moderate';
    let totalAgrees = 0;
    let totalDisagrees = 0;
    chatMessages.forEach(msg => {
       totalAgrees += (msg.agrees?.length || 0) + (msg.likes?.length || 0) + (msg.facts?.length || 0);
       totalDisagrees += (msg.disagrees?.length || 0) + (msg.dislikes?.length || 0) + (msg.caps?.length || 0);
    });
    if (totalAgrees > totalDisagrees * 2 && totalAgrees > 3) consensusLevel = 'High';
    else if (totalDisagrees > totalAgrees * 1.5 && totalDisagrees > 3) consensusLevel = 'Low';

    // 5. Intelligent Overview Generation
    const overview = `The room is currently maintaining a ${energy?.level || 'calm'} intensity. Thus far, ${timelineEvents?.length || 0} major timeline milestones have occurred. The discussion is heavily centered around claims relating to "${strongestArg.substring(0, 45)}...".`;

    const newSummary = {
        overview,
        strongestArgument: strongestArg,
        mostDisputed: mostDisputed,
        topContributor,
        consensusLevel,
        lastUpdated: new Date().toISOString(),
        messageCountAtAnalysis: chatMessages.length
    };

    setSummary(newSummary);
    localStorage.setItem(`forreal_summary_${roomId}`, JSON.stringify(newSummary));
    setIsAnalyzing(false);

  }, [roomId, chatMessages, timelineEvents, energy]);

  return { 
    summary, 
    isAnalyzing, 
    generateAnalysis 
  };
};