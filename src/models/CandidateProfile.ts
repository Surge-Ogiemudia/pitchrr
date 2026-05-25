import { Schema, Document } from 'mongoose';

interface TrackedField {
  value: string;
  source: string;
  updatedAt: Date;
}

interface SkillItem {
  name: string;
  category: 'technical' | 'tool' | 'language' | 'soft' | 'other';
  source: string;
  addedAt: Date;
}

interface WorkItem {
  company: string;
  role: string;
  startDate: Date | null;
  endDate: Date | null;
  isCurrent: boolean;
  achievements: string[];
  source: string;
  addedAt: Date;
}

interface EducationItem {
  degree: string;
  institution: string;
  year: string;
  grade: string;
  source: string;
  addedAt: Date;
}

interface CertificationItem {
  name: string;
  issuer: string;
  year: string;
  credentialUrl: string;
  source: string;
  addedAt: Date;
}

interface ProjectItem {
  name: string;
  description: string;
  impact: string;
  url: string;
  source: string;
  addedAt: Date;
}

interface Story {
  title: string;
  content: string;
  theme: 'leadership' | 'problem-solving' | 'impact' | 'growth' | 'failure' | 'collaboration' | 'conflict' | 'origin' | 'other';
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

export interface ICandidateProfile extends Document {
  // Identity
  fullName: TrackedField;
  email: TrackedField;
  phone: TrackedField;
  location: TrackedField;
  linkedIn: TrackedField;
  portfolio: TrackedField;
  headline: TrackedField;
  bio: TrackedField;
  // Career context
  currentRole: TrackedField;
  currentCompany: TrackedField;
  yearsOfExperience: TrackedField;
  industry: TrackedField;
  desiredRole: TrackedField;
  desiredSalary: TrackedField;
  workAuthorization: TrackedField;
  availability: TrackedField;
  writingVoice: TrackedField;
  // Structured arrays
  skills: SkillItem[];
  workHistory: WorkItem[];
  education: EducationItem[];
  certifications: CertificationItem[];
  projects: ProjectItem[];
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

const SkillItemSchema = new Schema({
  name: { type: String, required: true },
  category: { type: String, enum: ['technical', 'tool', 'language', 'soft', 'other'], default: 'other' },
  source: { type: String, default: 'manual' },
  addedAt: { type: Date, default: Date.now },
}, { _id: true });

const WorkItemSchema = new Schema({
  company: { type: String, required: true },
  role: { type: String, required: true },
  startDate: { type: Date, default: null },
  endDate: { type: Date, default: null },
  isCurrent: { type: Boolean, default: false },
  achievements: { type: [String], default: [] },
  source: { type: String, default: 'manual' },
  addedAt: { type: Date, default: Date.now },
}, { _id: true });

const EducationItemSchema = new Schema({
  degree: { type: String, required: true },
  institution: { type: String, required: true },
  year: { type: String, default: '' },
  grade: { type: String, default: '' },
  source: { type: String, default: 'manual' },
  addedAt: { type: Date, default: Date.now },
}, { _id: true });

const CertificationItemSchema = new Schema({
  name: { type: String, required: true },
  issuer: { type: String, default: '' },
  year: { type: String, default: '' },
  credentialUrl: { type: String, default: '' },
  source: { type: String, default: 'manual' },
  addedAt: { type: Date, default: Date.now },
}, { _id: true });

const ProjectItemSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  impact: { type: String, default: '' },
  url: { type: String, default: '' },
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

export const TRACKED_CANDIDATE_FIELDS = new Set([
  'fullName', 'email', 'phone', 'location', 'linkedIn', 'portfolio', 'headline', 'bio',
  'currentRole', 'currentCompany', 'yearsOfExperience', 'industry',
  'desiredRole', 'desiredSalary', 'workAuthorization', 'availability',
  'writingVoice',
]);

export const CandidateProfileSchema = new Schema({
  fullName: { type: TrackedFieldSchema, default: () => ({}) },
  email: { type: TrackedFieldSchema, default: () => ({}) },
  phone: { type: TrackedFieldSchema, default: () => ({}) },
  location: { type: TrackedFieldSchema, default: () => ({}) },
  linkedIn: { type: TrackedFieldSchema, default: () => ({}) },
  portfolio: { type: TrackedFieldSchema, default: () => ({}) },
  headline: { type: TrackedFieldSchema, default: () => ({}) },
  bio: { type: TrackedFieldSchema, default: () => ({}) },
  currentRole: { type: TrackedFieldSchema, default: () => ({}) },
  currentCompany: { type: TrackedFieldSchema, default: () => ({}) },
  yearsOfExperience: { type: TrackedFieldSchema, default: () => ({}) },
  industry: { type: TrackedFieldSchema, default: () => ({}) },
  desiredRole: { type: TrackedFieldSchema, default: () => ({}) },
  desiredSalary: { type: TrackedFieldSchema, default: () => ({}) },
  workAuthorization: { type: TrackedFieldSchema, default: () => ({}) },
  availability: { type: TrackedFieldSchema, default: () => ({}) },
  writingVoice: { type: TrackedFieldSchema, default: () => ({}) },
  skills: { type: [SkillItemSchema], default: [] },
  workHistory: { type: [WorkItemSchema], default: [] },
  education: { type: [EducationItemSchema], default: [] },
  certifications: { type: [CertificationItemSchema], default: [] },
  projects: { type: [ProjectItemSchema], default: [] },
  stories: {
    type: [{
      title: { type: String, required: true },
      content: { type: String, required: true },
      theme: {
        type: String,
        enum: ['leadership', 'problem-solving', 'impact', 'growth', 'failure', 'collaboration', 'conflict', 'origin', 'other'],
        default: 'other',
      },
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
  collection: 'candidate_profile',
});

export function getCandidateProfileModel(conn: any) {
  return conn.models.CandidateProfile || conn.model('CandidateProfile', CandidateProfileSchema);
}
