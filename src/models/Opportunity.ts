import mongoose, { Schema, Document } from 'mongoose';

export interface IOpportunity extends Document {
  programmeName: string;
  organisation: string;
  url: string;
  deadline: Date | null;
  prizeAmount: string;
  eligibilityCriteria: string;
  evaluationCriteria: string;
  scrapedQuestions: {
    question: string;
    wordLimit: number | null;
    section: string;
  }[];
  draftedAnswers: {
    questionIndex: number;
    content: string;
    version: number;
    framingNotes: string;
    status: 'draft' | 'review' | 'final';
  }[];
  fitScore: {
    overall: number;
    breakdown: {
      category: string;
      score: number;
      maxScore: number;
      explanation: string;
    }[];
  };
  winnerProfiles: {
    name: string;
    source: string;
    patterns: string;
  }[];
  winnerArchetype: {
    commonTraits: string[];
    typicalStage: string;
    alignmentSignals: string[];
  };
  competitiveIntel: {
    likelyCompetitors: string[];
    differentiators: string[];
  };
  momentumSignals: {
    milestone: string;
    impact: string;
    achievableBy: Date | null;
    plan: string;
  }[];
  relationshipActions: {
    person: string;
    platform: string;
    action: string;
    status: 'pending' | 'done';
  }[];
  timingIntel: {
    optimalSubmissionWindow: { start: Date; end: Date } | null;
    submittedAt: Date | null;
  };
  followUpSequence: {
    type: string;
    scheduledDate: Date;
    content: string;
    sent: boolean;
  }[];
  emailThread: {
    sender: string;
    subject: string;
    date: Date;
    classification: string;
    summary: string;
  }[];
  status: 'discovered' | 'analyzing' | 'drafting' | 'reviewing' | 'submitted' | 'confirmed' | 'interview' | 'decision' | 'won' | 'lost';
  statusHistory: {
    status: string;
    timestamp: Date;
    note: string;
  }[];
  rejectionFeedback: {
    feedback: string;
    lessonsLearned: string;
    adjustedFor: string[];
  } | null;
  unfairAdvantages: string[];
  askCalibration: {
    typicalRange: string;
    recommendedAsk: string;
    rationale: string;
  } | null;
  socialProofActions: {
    platform: string;
    content: string;
    scheduledDate: Date;
    posted: boolean;
  }[];
  notes: string;
  submissionDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const OpportunitySchema = new Schema({
  programmeName: { type: String, required: true },
  organisation: { type: String, required: true },
  url: { type: String, required: true },
  deadline: { type: Date, default: null },
  prizeAmount: { type: String, default: '' },
  eligibilityCriteria: { type: String, default: '' },
  evaluationCriteria: { type: String, default: '' },
  scrapedQuestions: [{
    question: String,
    wordLimit: { type: Number, default: null },
    section: { type: String, default: 'General' },
  }],
  draftedAnswers: [{
    questionIndex: Number,
    content: String,
    version: { type: Number, default: 1 },
    framingNotes: String,
    status: { type: String, enum: ['draft', 'review', 'final'], default: 'draft' },
  }],
  fitScore: {
    overall: { type: Number, default: 0 },
    breakdown: [{
      category: String,
      score: Number,
      maxScore: Number,
      explanation: String,
    }],
  },
  winnerProfiles: [{
    name: String,
    source: String,
    patterns: String,
  }],
  winnerArchetype: {
    commonTraits: [String],
    typicalStage: String,
    alignmentSignals: [String],
  },
  competitiveIntel: {
    likelyCompetitors: [String],
    differentiators: [String],
  },
  momentumSignals: [{
    milestone: String,
    impact: String,
    achievableBy: Date,
    plan: String,
  }],
  relationshipActions: [{
    person: String,
    platform: String,
    action: String,
    status: { type: String, enum: ['pending', 'done'], default: 'pending' },
  }],
  timingIntel: {
    optimalSubmissionWindow: {
      start: Date,
      end: Date,
    },
    submittedAt: { type: Date, default: null },
  },
  followUpSequence: [{
    type: String,
    scheduledDate: Date,
    content: String,
    sent: { type: Boolean, default: false },
  }],
  emailThread: [{
    sender: String,
    subject: String,
    date: Date,
    classification: String,
    summary: String,
  }],
  status: {
    type: String,
    enum: ['discovered', 'analyzing', 'drafting', 'reviewing', 'submitted', 'confirmed', 'interview', 'decision', 'won', 'lost'],
    default: 'discovered',
  },
  statusHistory: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    note: String,
  }],
  rejectionFeedback: {
    feedback: String,
    lessonsLearned: String,
    adjustedFor: [String],
  },
  unfairAdvantages: [String],
  askCalibration: {
    typicalRange: String,
    recommendedAsk: String,
    rationale: String,
  },
  socialProofActions: [{
    platform: String,
    content: String,
    scheduledDate: Date,
    posted: { type: Boolean, default: false },
  }],
  notes: { type: String, default: '' },
  submissionDate: { type: Date, default: null },
}, {
  timestamps: true,
  collection: 'opportunities',
});

export default mongoose.models.Opportunity || mongoose.model<IOpportunity>('Opportunity', OpportunitySchema);
