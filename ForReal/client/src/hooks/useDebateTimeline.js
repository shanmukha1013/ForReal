import { useState, useEffect, useCallback, useRef } from 'react';

export const useDebateTimeline = (roomId, room, chatMessages, energy) => {
  const [events, setEvents] = useState([]);
  const processedRefs = useRef(new Set());
  const lastSpikeRef = useRef(0);

  // Load persisted timeline
  useEffect(() => {
    if (!roomId) {return;}
    const local = JSON.parse(localStorage.getItem(`forreal_timeline_${roomId}`) || '[]');
    setEvents(local);
    local.forEach(e => {
        if (e.refId) {processedRefs.current.add(e.refId);}
        if (e.type === 'heat_spike') {lastSpikeRef.current = new Date(e.timestamp).getTime();}
    });
  }, [roomId]);

  const addEvent = useCallback((type, title, description, refId = null, actor = null) => {
    if (refId && processedRefs.current.has(refId)) {return;}
    if (refId) {processedRefs.current.add(refId);}

    const newEvent = {
      id: `te_${Date.now()}_${Math.random().toString(36).substr(2,9)}`,
      type, title, description, refId, actor,
      timestamp: new Date().toISOString()
    };

    setEvents(prev => {
      const updated = [...prev, newEvent];
      localStorage.setItem(`forreal_timeline_${roomId}`, JSON.stringify(updated));
      return updated;
    });
  }, [roomId]);

  // Auto-event watchers
  useEffect(() => {
    if (!room) {return;}
    
    // 1. Room Creation / Live
    if (room.status === 'active') {
      addEvent('milestone', 'Debate Started', 'The room went live and began accepting arguments.', 'room_start');
    }

    // 2. Deep Message Analysis (Key Arguments, Fact Checks, Disputes)
    if (chatMessages && chatMessages.length > 0) {
      chatMessages.forEach(msg => {
        const reactionCount = (msg.likes?.length || 0) + (msg.agrees?.length || 0) + (msg.validPoints?.length || 0);
        if (reactionCount >= 2) {addEvent('key_argument', 'Major Argument', `"${msg.text.substring(0, 60)}${msg.text.length > 60 ? '...' : ''}" resonated strongly with the room.`, `key_${msg._id}`, msg.sender);}
        if ((msg.facts?.length || 0) >= 1) {addEvent('fact_check', 'Community Verified Fact', 'A statement was actively backed by community facts.', `fact_${msg._id}`, msg.sender);}
        if ((msg.caps?.length || 0) >= 1 || (msg.misleadings?.length || 0) >= 1) {addEvent('dispute', 'Claim Disputed', 'The community heavily disputed a recent claim.', `dispute_${msg._id}`, msg.sender);}
      });
    }

    // 3. Heat Spikes (Energy surges)
    if (energy && energy.level === 'explosive') {
      const now = Date.now();
      if (now - lastSpikeRef.current > 60000) { // Max 1 spike event per minute
        addEvent('heat_spike', 'Energy Surge', 'Debate intensity reached an explosive level!', `heat_${now}`);
        lastSpikeRef.current = now;
      }
    }
  }, [room, chatMessages, energy, addEvent]);

  return { events, addEvent };
};