
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
    },
    matchAnalysis: {
      overallScore: 95,
      skillAlignment: 98,
      experienceFit: 92,
      reasoning: "Perfect skill overlap with the job requirements. Experience level aligns exactly with 'Senior' expectations.",
      skillMatches: [
        { skill: 'React', score: 100 },
        { skill: 'TypeScript', score: 95 },
        { skill: 'Testing (Jest)', score: 90 },
        { skill: 'State Management', score: 98 }
      ],
      requirementAnalysis: [
        { requirement: '5+ years experience', status: 'MET', comment: '6 years of verified experience.' },
        { requirement: 'TypeScript expertise', status: 'MET', comment: 'Uses TS in all current projects.' },
        { requirement: 'Web Performance', status: 'MET', comment: 'Demonstrated deep understanding of Core Web Vitals.' }
      ]
    }
  },
  {
    id: '2',
    name: 'Marcus Miller',
    email: 'm.miller@example.com',
    role: 'Senior React Developer',
    status: 'COMPLETED',
    score: 78,
    matchScore: 82,
    interviewDate: '2024-05-14',
    profile: {
      skills: ['React', 'JavaScript', 'CSS', 'Tailwind', 'PHP'],
      experienceYears: 4,
      education: 'Self-taught / Bootcamp',
      resumeSummary: 'Full-stack developer transitioning to frontend focus. Passionate about clean UI and modern CSS frameworks.'
    },
    matchAnalysis: {
      overallScore: 82,
      skillAlignment: 75,
      experienceFit: 85,
      reasoning: "Strong UI skills, but lacks deep experience with TypeScript and testing frameworks requested for this role.",
      skillMatches: [
        { skill: 'React', score: 85 },
        { skill: 'TypeScript', score: 40, gap: 'Has only used TS on small personal projects.' },
        { skill: 'Modern CSS', score: 100 },
        { skill: 'Testing', score: 30, gap: 'Limited experience with Jest/Cypress.' }
      ],
      requirementAnalysis: [
        { requirement: '5+ years experience', status: 'PARTIAL', comment: '4 years experience, close but below target.' },
        { requirement: 'TypeScript expertise', status: 'NOT_MET', comment: 'Requires significant upskilling.' }
      ]
    }
  },
  {
    id: '3',
    name: 'Elena Rodriguez',
    email: 'elena.r@example.com',
    role: 'Senior React Developer',
    status: 'PENDING',
    matchScore: 88,
    interviewDate: '2024-05-18',
    profile: {
      skills: ['Vue', 'React', 'Node.js', 'PostgreSQL'],
      experienceYears: 7,
      education: 'M.S. Software Engineering',
      resumeSummary: 'Versatile engineer with strong backend foundations and 3 years of dedicated React development.'
    },
    matchAnalysis: {
      overallScore: 88,
      skillAlignment: 80,
      experienceFit: 95,
      reasoning: "High engineering maturity. While primarily Vue recently, her core React and architectural skills are excellent.",
      skillMatches: [
        { skill: 'React', score: 85 },
        { skill: 'Architectural Design', score: 95 },
        { skill: 'Node.js', score: 90 },
        { skill: 'TypeScript', score: 80 }
      ],
      requirementAnalysis: [
        { requirement: '5+ years experience', status: 'MET', comment: '7 years total engineering experience.' },
        { requirement: 'React/Hooks', status: 'MET', comment: '3 years deep focus on React.' }
      ]
    }
  }
];

export const JOB_TEMPLATES: JobTemplate[] = [
  {
    id: 'tmpl-1',
    title: 'Senior Frontend Developer',
    description: 'Lead the development of our modern React-based AI interfaces.',
    requirements: [
      '5+ years experience with modern JavaScript frameworks',
      'Deep expertise in React, Hooks, and State Management',
      'Strong TypeScript skills',
      'Experience with Testing (Jest/Cypress)',
      'Knowledge of Web Performance and SEO'
    ],
    systemPrompt: 'You are a senior technical recruiter focusing on Frontend Engineering. Conduct a technical screening interview. Focus on React internals, performance optimization, and architectural patterns.',
    questions: [
      'Tell me about a complex React performance issue you solved.',
      'How do you handle global state in large applications?',
      'What is your approach to testing frontend components?'
    ]
  },
  {
    id: 'tmpl-2',
    title: 'Product Designer (UI/UX)',
    description: 'Design beautiful and intuitive user journeys for our recruiting platform.',
    requirements: [
      '3+ years experience in SaaS product design',
      'Mastery of Figma and prototyping tools',
      'Strong understanding of design systems',
      'Portfolio demonstrating user-centric problem solving',
      'Basic knowledge of HTML/CSS is a plus'
    ],
    systemPrompt: 'You are a Design Lead. Conduct a screening interview for a Product Designer. Focus on design process, user empathy, and visual hierarchy.',
    questions: [
      'Walk me through your typical design process from problem to solution.',
      'How do you balance user needs with business goals?',
      'Tell me about a time you had to defend a design decision to stakeholders.'
    ]
  }
];
