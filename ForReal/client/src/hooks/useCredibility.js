import { useState, useEffect } from 'react';

// Reputation weights for different interactions
export const CRED_WEIGHTS = { 
  like: 1, 
  dislike: -1, 
  agree: 2, 
  disagree: -1, 
  facts: 5, 
  cap: -3, 
  misleading: -5, 
  validPoint: 3 
};

// Dynamic title progression based on reputation thresholds
export const getRank = (score) => {
  if (score >= 10000) {return { title: 'Trusted Contributor', color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/30' };}
  if (score >= 5000) {return { title: 'Fact Checker', color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/30' };}
  if (score >= 2500) {return { title: 'Community Voice', color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/30' };}
  if (score >= 1500) {return { title: 'Analyst', color: 'text-neon', bg: 'bg-neon/10', border: 'border-neon/30' };}
  if (score >= 1000) {return { title: 'Debater', color: 'text-gray-300', bg: 'bg-white/10', border: 'border-white/20' };}
  if (score >= 500) {return { title: 'Novice', color: 'text-gray-400', bg: 'bg-white/5', border: 'border-white/10' };}
  return { title: 'Disputed', color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/30' };
};

// Calculate vote weight for fact-checking based on user's credibility
export const getVoteWeight = (score) => {
  if (score >= 5000) {return 5;}
  if (score >= 2500) {return 3;}
  if (score >= 1000) {return 2;}
  if (score >= 500) {return 1.5;}
  if (score < 500 && score > 0) {return 1;}
  return 0.5; // low credibility users have less weight
};

// Global mutation function to update any user's score instantly
export const updateCredibility = (userId, reactionType, isAdding) => {
  if (!userId) {return;}
  let delta = CRED_WEIGHTS[reactionType] || 0;
  if (!isAdding) {delta = -delta;}

  const credMap = JSON.parse(localStorage.getItem('forreal_credibility') || '{}');
  const currentScore = credMap[userId] !== undefined ? credMap[userId] : 1000;
  credMap[userId] = currentScore + delta;
  
  localStorage.setItem('forreal_credibility', JSON.stringify(credMap));
  window.dispatchEvent(new Event('credibility_update'));
};

// Global subscription hook for UI components
export const useCredibility = (userId) => {
  const [score, setScore] = useState(() => {
    const credMap = JSON.parse(localStorage.getItem('forreal_credibility') || '{}');
    return credMap[userId] !== undefined ? credMap[userId] : 1000; // Base baseline is 1000
  });

  useEffect(() => {
    const handleUpdate = () => {
      const credMap = JSON.parse(localStorage.getItem('forreal_credibility') || '{}');
      if (credMap[userId] !== undefined) {setScore(credMap[userId]);}
    };
    window.addEventListener('credibility_update', handleUpdate);
    return () => window.removeEventListener('credibility_update', handleUpdate);
  }, [userId]);

  return { score, rank: getRank(score) };
};