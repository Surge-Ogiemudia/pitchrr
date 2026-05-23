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
  archived: boolean;
  notes: string;
  submissionDate: Date | null;
  opportunityDnaLog: { role: 'user' | 'assistant'; content: string; timestamp: Date }[];
  winnersDnaLog: { role: 'user' | 'assistant'; content: string; timestamp: Date }[];
  evaluationFramework: {
    summary: string;
    weights: { category: string; weight: number; rationale: string }[];
    dealbreakers: string[];
    keySignals: string[];
    generatedAt: Date;
  } | null;
  alignmentEvidenceMap: {
    criterion: string;
    proofPoint: string;
    hasGap: boolean;
    improvementQuestion: string;
  }[];
  redFlags: {
    concern: string;
    reframe: string;
    severity: 'low' | 'medium' | 'high';
  }[];
  programmeVibe: {
    tone: string;
    energy: string;
    positioningGuidance: string;
    languageToUse: string[];
    languageToAvoid: string[];
    generatedAt: Date;
  } | null;
  timingContext: {
    currentEvents: string[];
    relevanceNote: string;
    generatedAt: Date;
  } | null;
  socialCapital: {
    connection: string;
    relationship: string;
    actionSuggested: string;
    messageDraft: string;
    status: 'pending' | 'activated';
  }[];
  reviewerPersona: {
    name: string;
    background: string;
    previousFunds: string[];
    values: string[];
    languageGuidance: string;
    generatedAt: Date;
  } | null;
  improvementTasks: {
    section: string;
    task: string;
    type: 'question' | 'file' | 'resource' | 'action';
    completed: boolean;
  }[];
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
    competitiveAdvantage: { type: String, default: '' },
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
  archived: { type: Boolean, default: false },
  notes: { type: String, default: '' },
  submissionDate: { type: Date, default: null },
  opportunityDnaLog: {
    type: [{ role: { type: String, enum: ['user', 'assistant'] }, content: String, timestamp: { type: Date, default: Date.now } }],
    default: [],
  },
  winnersDnaLog: {
    type: [{ role: { type: String, enum: ['user', 'assistant'] }, content: String, timestamp: { type: Date, default: Date.now } }],
    default: [],
  },
  evaluationFramework: {
    summary: { type: String, default: '' },
    weights: [{ category: String, weight: Number, rationale: String }],
    dealbreakers: [String],
    keySignals: [String],
    generatedAt: { type: Date },
  },
  alignmentEvidenceMap: [{
    criterion: String,
    proofPoint: { type: String, default: '' },
    hasGap: { type: Boolean, default: false },
    improvementQuestion: { type: String, default: '' },
  }],
  redFlags: [{
    concern: String,
    reframe: String,
    severity: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  }],
  programmeVibe: {
    tone: { type: String, default: '' },
    energy: { type: String, default: '' },
    positioningGuidance: { type: String, default: '' },
    languageToUse: [String],
    languageToAvoid: [String],
    generatedAt: { type: Date },
  },
  timingContext: {
    currentEvents: [String],
    relevanceNote: { type: String, default: '' },
    generatedAt: { type: Date },
  },
  socialCapital: [{
    connection: String,
    relationship: String,
    actionSuggested: String,
    messageDraft: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'activated'], default: 'pending' },
  }],
  reviewerPersona: {
    name: { type: String, default: '' },
    background: { type: String, default: '' },
    previousFunds: [String],
    values: [String],
    languageGuidance: { type: String, default: '' },
    generatedAt: { type: Date },
  },
  improvementTasks: [{
    section: { type: String, required: true },
    task: { type: String, required: true },
    type: { type: String, enum: ['question', 'file', 'resource', 'action'], default: 'action' },
    completed: { type: Boolean, default: false },
  }],
}, {
  timestamps: true,
  collection: 'opportunities',
});

export default mongoose.models.Opportunity || mongoose.model<IOpportunity>('Opportunity', OpportunitySchema);
