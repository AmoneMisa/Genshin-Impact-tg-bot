// Read-only configuration check. Does not start a transaction or change data.
import mongoose from 'mongoose';

try {
  if (!process.env.MONGO_URL) throw Object.assign(new Error(), {code: 'MONGO_URL_MISSING'});
  await mongoose.connect(process.env.MONGO_URL, {serverSelectionTimeoutMS: 10000});
  const hello = await mongoose.connection.db.admin().command({hello: 1});
  const supported = Boolean(hello.setName || hello.msg === 'isdbgrid');
  console.log(JSON.stringify({
    transactionsSupported: supported,
    topology: hello.msg === 'isdbgrid' ? 'sharded' : hello.setName ? 'replicaSet' : 'standalone',
    writablePrimary: Boolean(hello.isWritablePrimary),
  }, null, 2));
  if (!supported) process.exitCode = 2;
} catch (error) {
  // Connection errors can contain credentials: print only their type and code.
  console.error(JSON.stringify({checkFailed: true, type: error.name, code: error.code || null}));
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
