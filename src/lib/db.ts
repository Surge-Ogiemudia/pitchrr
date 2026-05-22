import mongoose from 'mongoose';

// Connect to the Pitchrr database (opportunities, email logs, etc)
let pitchrrCached = (global as any).mongoosePitchrr;
if (!pitchrrCached) {
  pitchrrCached = (global as any).mongoosePitchrr = { conn: null, promise: null };
}

export async function dbConnect() {
  const MONGODB_URI = process.env.PITCHRR_MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error('Please define the PITCHRR_MONGODB_URI environment variable');
  }

  if (pitchrrCached.conn) return pitchrrCached.conn;

  if (!pitchrrCached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
    };
    pitchrrCached.promise = mongoose.connect(MONGODB_URI, opts).then((m) => m);
  }

  try {
    pitchrrCached.conn = await pitchrrCached.promise;
  } catch (e) {
    pitchrrCached.promise = null;
    throw e;
  }

  return pitchrrCached.conn;
}

// Connect to the Preparr database specifically for the shared founder profile
let preparrCached = (global as any).mongoosePreparrShared;
if (!preparrCached) {
  preparrCached = (global as any).mongoosePreparrShared = { conn: null, promise: null };
}

export async function dbConnectShared() {
  const MONGODB_URI = process.env.PREPARR_MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error('Please define the PREPARR_MONGODB_URI environment variable');
  }

  if (preparrCached.conn) return preparrCached.conn;

  if (!preparrCached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 5,
    };
    preparrCached.promise = mongoose.createConnection(MONGODB_URI, opts).asPromise();
  }

  try {
    preparrCached.conn = await preparrCached.promise;
  } catch (e) {
    preparrCached.promise = null;
    throw e;
  }

  return preparrCached.conn;
}
