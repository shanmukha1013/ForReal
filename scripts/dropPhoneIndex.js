import mongoose from 'mongoose';

async function main(){
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/forreal';
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const users = db.collection('users');
  try {
    await users.dropIndex('phone_1');
    console.log('Dropped index phone_1');
  } catch (err) {
    console.error('Error dropping index:', err.message);
  }
  const idx = await users.indexes();
  console.log('Remaining indexes:', idx);
  process.exit(0);
}

main().catch(err=>{console.error(err); process.exit(1);});
