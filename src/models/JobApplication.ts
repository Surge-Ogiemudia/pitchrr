import mongoose, { Schema, Document } from 'mongoose';

export interface IJobApplication extends Document {
  jobTitle: string;
  company: string;
  url: string;
  deadline: Date | null;
  salaryRange: string;
  location: string;
  employmentType: string;
  department: string;
  requiredQualifications: string;
  preferredQualifications: string;
  responsibilities: string;
  applicationQuestions: {
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
  coverLetter: {
    content: string;
    version: number;
    framingNotes: string;
    status: 'draft' | 'review' | 'final';
  }[];
  resumeTailoring: {
    suggestions: string[];
    tailoredSummary: string;
    atsKeywords: string[];
    generatedAt: Date;
  } | null;
  interviewPrep: {
    likelyQuestions: {
      question: string;
      category: 'behavioural' | 'technical' | 'situational' | 'culture' | 'case';
      notes: string;
    }[];
    technicalTopics: string[];
    caseStudies: string[];
    questionsToAsk: {
      question: string;
      intent: string;
      round: string;
    }[];
    generatedAt: Date;
  } | null;
  interviewRounds: {
    round: number;
    type: 'phone' | 'technical' | 'take-home' | 'panel' | 'final' | 'reference';
    scheduledAt: Date | null;
    interviewer: string;
    notes: string;
    outcome: string;
    status: 'scheduled' | 'completed' | 'cancelled';
  }[];
  offerDetails: {
    baseSalary: string;
    equity: string;
    bonus: string;
    benefits: string;
    startDate: Date | null;
    expiryDate: Date | null;
    notes: string;
    receivedAt: Date | null;
  } | null;
  recruiterInfo: {
    name: string;
    email: string;
    linkedIn: string;
    company: string;
  } | null;
  jobSource: string;
  applicationMethod: string;
  jobId: string;
  fitScore: {
    overall: number;
    breakdown: {
      category: string;
      score: number;
      maxScore: number;
      explanation: string;
    }[];
  };
  pastHireProfiles: {
    name: string;
    source: string;
    patterns: string;
  }[];
  pastHireArchetype: {
    commonTraits: string[];
    typicalBackground: string;
    alignmentSignals: string[];
  };
  competitiveIntel: {
    typicalCandidates: string[];
    differentiators: string[];
    competitiveAdvantage: string;
  };
  preparationMilestones: {
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
    appliedAt: Date | null;
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
  status: 'discovered' | 'preparing' | 'applied' | 'screening' | 'interview' | 'offer' | 'negotiating' | 'accepted' | 'rejected' | 'withdrawn';
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
  salaryCalibration: {
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
  companyVibe: {
    tone: string;
    energy: string;
    positioningGuidance: string;
    languageToUse: string[];
    languageToAvoid: string[];
    generatedAt: Date;
  } | null;
  interviewerPersona: {
    name: string;
    background: string;
    previouslyHiredFrom: string[];
    values: string[];
    languageGuidance: string;
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
  improvementTasks: {
    section: string;
    task: string;
    type: 'question' | 'file' | 'resource' | 'action';
    completed: boolean;
  }[];
  archived: boolean;
  notes: string;
  appliedAt: Date | null;
  companyDnaLog: { role: 'user' | 'assistant'; content: string; timestamp: Date }[];
  pastHiresDnaLog: { role: 'user' | 'assistant'; content: string; timestamp: Date }[];
  createdAt: Date;
  updatedAt: Date;
}

const JobApplicationSchema = new Schema({
  jobTitle: { type: String, required: true },
  company: { type: String, required: true },
  url: { type: String, required: true },
  deadline: { type: Date, default: null },
  salaryRange: { type: String, default: '' },
  location: { type: String, default: '' },
  employmentType: { type: String, default: '' },
  department: { type: String, default: '' },
  requiredQualifications: { type: String, default: '' },
  preferredQualifications: { type: String, default: '' },
  responsibilities: { type: String, default: '' },
  applicationQuestions: [{
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
  coverLetter: [{
    content: { type: String, default: '' },
    version: { type: Number, default: 1 },
    framingNotes: { type: String, default: '' },
    status: { type: String, enum: ['draft', 'review', 'final'], default: 'draft' },
  }],
  resumeTailoring: {
    suggestions: [String],
    tailoredSummary: { type: String, default: '' },
    atsKeywords: { type: [String], default: [] },
    generatedAt: { type: Date },
  },
  interviewPrep: {
    likelyQuestions: [{
      question: String,
      category: { type: String, enum: ['behavioural', 'technical', 'situational', 'culture', 'case'], default: 'behavioural' },
      notes: { type: String, default: '' },
    }],
    technicalTopics: [String],
    caseStudies: [String],
    questionsToAsk: [{
      question: { type: String, default: '' },
      intent: { type: String, default: '' },
      round: { type: String, default: '' },
    }],
    generatedAt: { type: Date },
  },
  interviewRounds: [{
    round: { type: Number, required: true },
    type: { type: String, enum: ['phone', 'technical', 'take-home', 'panel', 'final', 'reference'], default: 'phone' },
    scheduledAt: { type: Date, default: null },
    interviewer: { type: String, default: '' },
    notes: { type: String, default: '' },
    outcome: { type: String, default: '' },
    status: { type: String, enum: ['scheduled', 'completed', 'cancelled'], default: 'scheduled' },
  }],
  offerDetails: {
    baseSalary: { type: String, default: '' },
    equity: { type: String, default: '' },
    bonus: { type: String, default: '' },
    benefits: { type: String, default: '' },
    startDate: { type: Date, default: null },
    expiryDate: { type: Date, default: null },
    notes: { type: String, default: '' },
    receivedAt: { type: Date, default: null },
  },
  recruiterInfo: {
    name: { type: String, default: '' },
    email: { type: String, default: '' },
    linkedIn: { type: String, default: '' },
    company: { type: String, default: '' },
  },
  jobSource: { type: String, default: '' },
  applicationMethod: { type: String, default: '' },
  jobId: { type: String, default: '' },
  fitScore: {
    overall: { type: Number, default: 0 },
    breakdown: [{
      category: String,
      score: Number,
      maxScore: Number,
      explanation: String,
    }],
  },
  pastHireProfiles: [{
    name: String,
    source: String,
    patterns: String,
  }],
  pastHireArchetype: {
    commonTraits: [String],
    typicalBackground: { type: String, default: '' },
    alignmentSignals: [String],
  },
  competitiveIntel: {
    typicalCandidates: [String],
    differentiators: [String],
    competitiveAdvantage: { type: String, default: '' },
  },
  preparationMilestones: [{
    milestone: String,
    impact: String,
    achievableBy: { type: Date, default: null },
    plan: String,
  }],
  relationshipActions: [{
    person: String,
    platform: String,
    action: String,
    status: { type: String, enum: ['pending', 'done'], default: 'pending' },
  }],
  timingIntel: {
    optimalSubmissionWindow: { start: Date, end: Date },
    appliedAt: { type: Date, default: null },
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
    enum: ['discovered', 'preparing', 'applied', 'screening', 'interview', 'offer', 'negotiating', 'accepted', 'rejected', 'withdrawn'],
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
  salaryCalibration: {
    typicalRange: { type: String, default: '' },
    recommendedAsk: { type: String, default: '' },
    rationale: { type: String, default: '' },
  },
  socialProofActions: [{
    platform: String,
    content: String,
    scheduledDate: Date,
    posted: { type: Boolean, default: false },
  }],
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
  companyVibe: {
    tone: { type: String, default: '' },
    energy: { type: String, default: '' },
    positioningGuidance: { type: String, default: '' },
    languageToUse: [String],
    languageToAvoid: [String],
    generatedAt: { type: Date },
  },
  interviewerPersona: {
    name: { type: String, default: '' },
    background: { type: String, default: '' },
    previouslyHiredFrom: [String],
    values: [String],
    languageGuidance: { type: String, default: '' },
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
  improvementTasks: [{
    section: { type: String, required: true },
    task: { type: String, required: true },
    type: { type: String, enum: ['question', 'file', 'resource', 'action'], default: 'action' },
    completed: { type: Boolean, default: false },
  }],
  archived: { type: Boolean, default: false },
  notes: { type: String, default: '' },
  appliedAt: { type: Date, default: null },
  companyDnaLog: {
    type: [{ role: { type: String, enum: ['user', 'assistant'] }, content: String, timestamp: { type: Date, default: Date.now } }],
    default: [],
  },
  pastHiresDnaLog: {
    type: [{ role: { type: String, enum: ['user', 'assistant'] }, content: String, timestamp: { type: Date, default: Date.now } }],
    default: [],
  },
}, {
  timestamps: true,
  collection: 'job_applications',
});

export default mongoose.models.JobApplication || mongoose.model<IJobApplication>('JobApplication', JobApplicationSchema);
