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

interface Story {
  title: string;
  content: string;
  theme: 'origin' | 'impact' | 'credibility' | 'customer' | 'turning-point' | 'team' | 'other';
  addedAt: Date;
}

export interface IStartupProfile extends Document {
  // Founder contact & identity
  founderName: TrackedField;
  founderEmail: TrackedField;
  founderPhone: TrackedField;
  founderLocation: TrackedField;
  founderLinkedIn: TrackedField;
  founderBio: TrackedField;
  // Startup basics
  startupName: TrackedField;
  website: TrackedField;
  stage: TrackedField;
  industry: TrackedField;
  // Startup narrative
  oneLiner: TrackedField;
  problem: TrackedField;
  solution: TrackedField;
  businessModel: TrackedField;
  marketSize: TrackedField;
  uniqueness: TrackedField;
  useOfFunds: TrackedField;
  mission: TrackedField;
  // Structured data
  writingVoice: TrackedField;
  traction: TractionItem[];
  team: TeamMember[];
  stories: Story[];
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

export const TRACKED_PROFILE_FIELDS = new Set([
  'founderName', 'founderEmail', 'founderPhone', 'founderLocation', 'founderLinkedIn', 'founderBio',
  'startupName', 'website', 'stage', 'industry',
  'oneLiner', 'problem', 'solution', 'businessModel', 'marketSize', 'uniqueness', 'mission', 'useOfFunds',
  'writingVoice',
]);

export const StartupProfileSchema = new Schema({
  founderName: { type: TrackedFieldSchema, default: () => ({}) },
  founderEmail: { type: TrackedFieldSchema, default: () => ({}) },
  founderPhone: { type: TrackedFieldSchema, default: () => ({}) },
  founderLocation: { type: TrackedFieldSchema, default: () => ({}) },
  founderLinkedIn: { type: TrackedFieldSchema, default: () => ({}) },
  founderBio: { type: TrackedFieldSchema, default: () => ({}) },
  startupName: { type: TrackedFieldSchema, default: () => ({}) },
  website: { type: TrackedFieldSchema, default: () => ({}) },
  stage: { type: TrackedFieldSchema, default: () => ({}) },
  industry: { type: TrackedFieldSchema, default: () => ({}) },
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
  writingVoice: { type: TrackedFieldSchema, default: () => ({}) },
  stories: {
    type: [{
      title: { type: String, required: true },
      content: { type: String, required: true },
      theme: { type: String, enum: ['origin', 'impact', 'credibility', 'customer', 'turning-point', 'team', 'other'], default: 'other' },
      addedAt: { type: Date, default: Date.now },
    }],
    default: [],
  },
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

export function getStartupProfileModel(conn: any) {
  return conn.models.StartupProfile || conn.model('StartupProfile', StartupProfileSchema);
}
