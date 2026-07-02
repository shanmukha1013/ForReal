const fs = require('fs');
const files = [
  'client/src/components/CreateDebateForm.jsx',
  'client/src/components/ErrorBoundary.jsx',
  'client/src/components/Layout.jsx',
  'client/src/components/PostCard.jsx',
  'client/src/pages/Admin.jsx',
  'client/src/pages/Home.jsx',
  'client/src/pages/Room.jsx',
  'client/src/pages/Rooms.jsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // CreateDebateForm
  content = content.replace('🌍 Public', 'Public');
  content = content.replace('🔒 Private', 'Private');
  
  // ErrorBoundary
  content = content.replace('<span className="text-3xl">⚠️</span>', '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#C1121F" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>');

  // Layout
  content = content.replace('Home 🏠', 'Home');
  content = content.replace('Explore 🔍', 'Explore');
  content = content.replace('Messages ✉️', 'Messages');
  content = content.replace('Notifications 🔔', 'Notifications');

  // PostCard & Room
  content = content.replace(/icon:\s*['"]❤️['"]/g, "icon: '[+]'");
  content = content.replace(/icon:\s*['"]👎['"]/g, "icon: '[-]'");
  content = content.replace(/icon:\s*['"]🤝['"]/g, "icon: '[AGREE]'");
  content = content.replace(/icon:\s*['"]🙅['"]/g, "icon: '[DISAGREE]'");
  content = content.replace(/icon:\s*['"]💯['"]/g, "icon: '[FACTS]'");
  content = content.replace(/icon:\s*['"]🧢['"]/g, "icon: '[CAP]'");
  content = content.replace(/icon:\s*['"]⚠️['"]/g, "icon: '[!]'");
  content = content.replace(/icon:\s*['"]🎯['"]/g, "icon: '[*]'");

  // Admin
  content = content.replace(/'📝 Talk'/g, "'Talk'");
  content = content.replace(/'👤 User'/g, "'User'");

  // Home
  content = content.replace('Raw Debates 🎙️', 'Raw Debates');

  // Rooms
  content = content.replace('🔥 Trending', 'Trending');
  content = content.replace('💬 Most Active', 'Most Active');
  content = content.replace('🕒 Recent', 'Recent');

  fs.writeFileSync(file, content);
});
console.log('Emojis replaced!');
