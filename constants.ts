
import { Candidate, JobTemplate } from './types';

export const INITIAL_CANDIDATES: Candidate[] = [
  {
    id: '1',
    name: 'Sarah Chen',
    email: 'sarah.c@example.com',
    role: 'Senior React Developer',
    status: 'SHORTLISTED',
    score: 92,
    matchScore: 95,
    interviewDate: '2024-05-15',
    profile: {
      skills: ['React', 'TypeScript', 'Next.js', 'Redux', 'Jest'],
      experienceYears: 6,
      education: 'B.S. Computer Science',
      resumeSummary: 'Experienced frontend engineer specializing in high-performance web applications and scalable design systems.'
    }
  }
];

export const INITIAL_JOBS: JobTemplate[] = [
  {
    id: 'tmpl-1',
    title: 'Senior React Developer',
    description: 'Lead the development of our modern React-based AI interfaces. Focus on high performance and clean architecture.',
    minExperience: 5,
    requiredSkills: ['React', 'TypeScript', 'Jest', 'Core Web Vitals'],
    educationRequirement: "Bachelor's Degree in CS or equivalent",
    requirements: [
      '5+ years experience with modern JavaScript frameworks',
      'Deep expertise in React, Hooks, and State Management'
    ],
    systemPrompt: 'You are a senior technical recruiter focusing on Frontend Engineering. Conduct a technical screening interview.',
    questions: [
      'Tell me about a complex React performance issue you solved.',
      'How do you handle global state in large applications?'
    ],
    status: 'OPEN',
    createdAt: '2024-01-01T00:00:00Z',
    applicantCount: 1
  },
  {
    id: 'tmpl-2',
    title: 'Product Designer (UI/UX)',
    description: 'Design beautiful and intuitive user journeys for our recruiting platform.',
    minExperience: 3,
    requiredSkills: ['Figma', 'Prototyping', 'Design Systems', 'User Research'],
    educationRequirement: "Design-related degree or equivalent",
    requirements: [
      '3+ years experience in SaaS product design'
    ],
    systemPrompt: 'You are a Design Lead. Conduct a screening interview for a Product Designer.',
    questions: [
      'Walk me through your typical design process.',
      'How do you balance user needs with business goals?'
    ],
    status: 'OPEN',
    createdAt: '2024-01-02T00:00:00Z',
    applicantCount: 0
  }
];
