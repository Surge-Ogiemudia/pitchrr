import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password?: string;
  name: string;
  persona: 'startup' | 'career';
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: false },
  name: { type: String, required: true },
  persona: { type: String, enum: ['startup', 'career'], default: 'startup' },
}, {
  timestamps: true,
  collection: 'users',
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
