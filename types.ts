
export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  CANDIDATE = 'CANDIDATE'
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface CandidateProfile {
  skills: string[];
  experienceYears: number;
  education: string;
  resumeSummary: string;
}

export interface SkillMatch {
  skill: string;
  score: number;
  gap?: string;
}

export interface RequirementMatch {
  requirement: string;
  status: 'MET' | 'PARTIAL' | 'NOT_MET';
  comment: string;
}

export interface MatchAnalysis {
  overallScore: number;
  skillAlignment: number;
  experienceFit: number;
  reasoning: string;
  skillMatches?: SkillMatch[];
  requirementAnalysis?: RequirementMatch[];
}

export interface ManagerAssessment {
  score: number;
  comments: string;
  recommendation: 'HIRE' | 'REJECT' | 'FOLLOW_UP';
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'PENDING' | 'INTERVIEWING' | 'COMPLETED' | 'REJECTED' | 'SHORTLISTED';
  score?: number; // Interview score (AI)
  matchScore?: number; // Algorithm matching score
  matchAnalysis?: MatchAnalysis;
  summary?: string;
  interviewDate: string;
  interviewTime?: string;
  profile?: CandidateProfile;
  preparationMessage?: string;
  transcript?: string;
  managerAssessment?: ManagerAssessment;
  cvReviewed?: boolean;
  boardMembers?: string[];
}

export interface JobTemplate {
  id: string;
  title: string;
  description: string;
  systemPrompt: string;
  questions: string[];
  requirements: string[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface InterviewEvaluation {
  score: number;
  technicalProficiency: string;
  communicationSkills: string;
  culturalFit: string;
  finalRecommendation: string;
  keyStrengths: string[];
  areasForImprovement: string[];
}

export interface JobAlertSubscription {
  id: string;
  candidateEmail: string;
  candidateName: string;
  keywords: string[];
  active: boolean;
  createdAt: string;
}

export interface JobAlertLog {
  id: string;
  candidateEmail: string;
  jobTitle: string;
  matchKeyword: string;
  sentAt: string;
}
