import mongoose from 'mongoose';

async function main(){
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/forreal';
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  console.log('Collections:', collections.map(c=>c.name));
  const users = db.collection('users');
  const idx = await users.indexes();
  console.log('Users indexes:', idx);
  process.exit(0);
}

main().catch(err=>{console.error(err); process.exit(1);});
