import { Schema, Document } from 'mongoose';

interface TrackedField {
  value: string;
  source: string;
  updatedAt: Date;
}

interface TractionItem {
  description: string;
  type: 'revenue' | 'users' | 'partnerships' | 'wordOfMouth' | 'milestone' | 'other';
  source: string;
  addedAt: Date;
}

interface TeamMember {
  name: string;
  role: string;
  background: string;
  source: string;
  addedAt: Date;
}

interface DynamicField {
  key: string;
  value: string;
  source: string;
  confidence: number;
  addedAt: Date;
}

interface Framing {
  topic: string;
  framing: string;
  frequency: number;
  source: string;
  addedAt: Date;
}

export interface IStartupProfile extends Document {
  oneLiner: TrackedField;
  problem: TrackedField;
  solution: TrackedField;
  traction: TractionItem[];
  team: TeamMember[];
  businessModel: TrackedField;
  marketSize: TrackedField;
  uniqueness: TrackedField;
  useOfFunds: TrackedField;
  mission: TrackedField;
  dynamicFields: DynamicField[];
  framings: Framing[];
  draftingRules: string[];
  conversationLog: { role: 'user' | 'assistant'; content: string; timestamp: Date }[];
  createdAt: Date;
  updatedAt: Date;
}

const TrackedFieldSchema = new Schema({
  value: { type: String, default: '' },
  source: { type: String, default: 'manual' },
  updatedAt: { type: Date, default: Date.now },
}, { _id: false });

const TractionItemSchema = new Schema({
  description: { type: String, required: true },
  type: { type: String, enum: ['revenue', 'users', 'partnerships', 'wordOfMouth', 'milestone', 'other'], default: 'other' },
  source: { type: String, default: 'manual' },
  addedAt: { type: Date, default: Date.now },
}, { _id: true });

const TeamMemberSchema = new Schema({
  name: { type: String, required: true },
  role: { type: String, default: '' },
  background: { type: String, default: '' },
  source: { type: String, default: 'manual' },
  addedAt: { type: Date, default: Date.now },
}, { _id: true });

const DynamicFieldSchema = new Schema({
  key: { type: String, required: true },
  value: { type: String, required: true },
  source: { type: String, default: 'ai' },
  confidence: { type: Number, default: 0.5, min: 0, max: 1 },
  addedAt: { type: Date, default: Date.now },
}, { _id: true });

const FramingSchema = new Schema({
  topic: { type: String, required: true },
  framing: { type: String, required: true },
  frequency: { type: Number, default: 1 },
  source: { type: String, default: 'ai' },
  addedAt: { type: Date, default: Date.now },
}, { _id: true });

export const StartupProfileSchema = new Schema({
  oneLiner: { type: TrackedFieldSchema, default: () => ({}) },
  problem: { type: TrackedFieldSchema, default: () => ({}) },
  solution: { type: TrackedFieldSchema, default: () => ({}) },
  traction: { type: [TractionItemSchema], default: [] },
  team: { type: [TeamMemberSchema], default: [] },
  businessModel: { type: TrackedFieldSchema, default: () => ({}) },
  marketSize: { type: TrackedFieldSchema, default: () => ({}) },
  uniqueness: { type: TrackedFieldSchema, default: () => ({}) },
  useOfFunds: { type: TrackedFieldSchema, default: () => ({}) },
  mission: { type: TrackedFieldSchema, default: () => ({}) },
  dynamicFields: { type: [DynamicFieldSchema], default: [] },
  framings: { type: [FramingSchema], default: [] },
  draftingRules: { type: [String], default: [] },
  conversationLog: {
    type: [{ role: { type: String, enum: ['user', 'assistant'] }, content: String, timestamp: { type: Date, default: Date.now } }],
    default: [],
  },
}, {
  timestamps: true,
  collection: 'startup_profile',
});

// Helper function to get the model securely from a connection
export function getStartupProfileModel(conn: any) {
  return conn.models.StartupProfile || conn.model('StartupProfile', StartupProfileSchema);
}
