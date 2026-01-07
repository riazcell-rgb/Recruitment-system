
import { GoogleGenAI, Type } from "@google/genai";
import { InterviewEvaluation, ChatMessage, Candidate, JobTemplate, MatchAnalysis } from "../types";

// The API key must be obtained exclusively from process.env.API_KEY.
// Always use gemini-3-flash-preview for general chat tasks.
export const startInterviewChat = (systemInstruction: string, history: { role: 'user' | 'model', parts: [{ text: string }] }[] = []) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction,
      temperature: 0.7,
    },
    history: history,
  });
};

// Use gemini-3-pro-preview for tasks requiring advanced reasoning like evaluation.
export const evaluateInterview = async (transcript: string): Promise<InterviewEvaluation> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Evaluate this interview transcript and provide a structured assessment:\n\n${transcript}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER, description: "Overall score out of 100" },
          technicalProficiency: { type: Type.STRING },
          communicationSkills: { type: Type.STRING },
          culturalFit: { type: Type.STRING },
          finalRecommendation: { type: Type.STRING },
          keyStrengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          areasForImprovement: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["score", "technicalProficiency", "finalRecommendation"],
      },
    },
  });

  return JSON.parse(response.text || '{}');
};

// Use gemini-3-pro-preview for high-quality analysis of candidate fit.
export const calculateMatchScore = async (candidate: Candidate, template: JobTemplate): Promise<MatchAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `
    Compare this candidate profile against the job requirements.
    
    JOB REQUIREMENTS:
    ${template.requirements.join('\n')}
    
    CANDIDATE PROFILE:
    Skills: ${candidate.profile?.skills.join(', ')}
    Experience: ${candidate.profile?.experienceYears} years
    Summary: ${candidate.profile?.resumeSummary}
    Interview Performance Score: ${candidate.score || 'N/A'}
    
    Return a detailed matching analysis including individual skill scores and a requirement checklist.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          overallScore: { type: Type.NUMBER, description: "Composite score out of 100" },
          skillAlignment: { type: Type.NUMBER, description: "Score for specific skill overlap" },
          experienceFit: { type: Type.NUMBER, description: "Score for seniority and tenure fit" },
          reasoning: { type: Type.STRING, description: "Brief explanation of the match" },
          skillMatches: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                skill: { type: Type.STRING },
                score: { type: Type.NUMBER },
                gap: { type: Type.STRING }
              },
              required: ["skill", "score"]
            }
          },
          requirementAnalysis: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                requirement: { type: Type.STRING },
                status: { type: Type.STRING, description: "MET, PARTIAL, or NOT_MET" },
                comment: { type: Type.STRING }
              },
              required: ["requirement", "status", "comment"]
            }
          }
        },
        required: ["overallScore", "reasoning", "skillMatches", "requirementAnalysis"]
      }
    }
  });

  return JSON.parse(response.text || '{}');
};
