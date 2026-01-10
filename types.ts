
export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  CANDIDATE = 'CANDIDATE',
  BOARD_MEMBER = 'BOARD_MEMBER'
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
  alertKeywords?: string[];
  cvFileName?: string;
  cvUploadDate?: string;
  // Extended fields
  mobile?: string;
  portfolioUrl?: string;
  imageUrl?: string;
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

export interface LiveCommand {
  type: 'START' | 'STOP' | 'PAUSE' | 'RESUME' | 'PUSH_PROMPT' | 'RECORD_START' | 'RECORD_STOP';
  payload?: string;
  timestamp: string;
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'PENDING' | 'INTERVIEWING' | 'PAUSED' | 'COMPLETED' | 'REJECTED' | 'SHORTLISTED';
  score?: number; 
  matchScore?: number; 
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
  lastCommand?: LiveCommand;
  isManagerJoined?: boolean;
  requestedBoardMembers?: string[];
  activeMeetingRoom?: string;
  meetingParticipants?: string[];
}

export interface JobTemplate {
  id: string;
  title: string;
  description: string;
  systemPrompt: string;
  questions: string[];
  requirements: string[]; 
  minExperience: number;
  requiredSkills: string[];
  educationRequirement: string;
  coverImageUrl?: string;
  // Metadata for Job Posting System
  status: 'OPEN' | 'CLOSED' | 'DRAFT';
  createdAt: string;
  applicantCount?: number;
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
