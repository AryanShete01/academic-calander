import { GoogleGenAI, Type } from "@google/genai";
import { UserState, CalendarDay } from "../types";
 
const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string;

const ai = new GoogleGenAI({
  apiKey,
});



// Helper to get subjects based on board and grade
export const fetchSubjects = async (board: string, grade: string, stateName?: string): Promise<string[]> => {
  const boardName = board === 'State Board' ? `${stateName} State Board` : board;
  
  const prompt = `List the standard major academic subjects for a student in ${grade} under the ${boardName} in India. Return only the subject names as a simple list. Do not include optional languages unless they are major.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subjects: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        }
      }
    });

    const data = JSON.parse(response.text || '{"subjects": []}');
    return data.subjects || [];
  } catch (error) {
    console.error("Error fetching subjects:", error);
    // Fallback for demo purposes if AI fails
    return ["Mathematics", "Science", "Social Science", "English", "Hindi"];
  }
};

// Helper to get syllabus topics
export const fetchTopics = async (board: string, grade: string, subjects: string[], stateName?: string): Promise<Record<string, string[]>> => {
  const boardName = board === 'State Board' ? `${stateName} State Board` : board;
  
  const prompt = `
    For the ${boardName}, ${grade}, list the official chapter names/topics for the following subjects: ${subjects.join(', ')}.
    Ensure the topics are strictly according to the latest official syllabus.
    Return a JSON object where keys are subject names and values are arrays of topic strings.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
             // We can't define exact keys since subjects are dynamic, so we ask for an array of objects
             syllabus: {
               type: Type.ARRAY,
               items: {
                 type: Type.OBJECT,
                 properties: {
                   subject: { type: Type.STRING },
                   topics: { type: Type.ARRAY, items: { type: Type.STRING } }
                 }
               }
             }
          }
        }
      }
    });

    const data = JSON.parse(response.text || '{"syllabus": []}');
    // Transform back to Record<string, string[]>
    const syllabusMap: Record<string, string[]> = {};
    if (data.syllabus) {
      data.syllabus.forEach((item: any) => {
        syllabusMap[item.subject] = item.topics;
      });
    }
    return syllabusMap;

  } catch (error) {
    console.error("Error fetching topics:", error);
    return {};
  }
};

// Main Calendar Generation
export const generateStudyCalendar = async (state: UserState): Promise<CalendarDay[]> => {
  const boardName = state.board === 'State Board' ? `${state.stateName} State Board` : state.board;
  
  const prompt = `
    Act as an expert academic planner for Indian students.
    Create a realistic study calendar for a student with the following profile:
    - Board: ${boardName}
    - Class: ${state.grade}
    - Exam Date: ${state.examDate}
    - Daily Study Hours: ${state.dailyHours}
    - Weak Subjects: ${state.weakSubjects.join(', ')} (Give more focus here)
    - Strong Subjects: ${state.strongSubjects.join(', ')} (Review efficiently)
    - Available Subjects & Topics: ${JSON.stringify(state.syllabusTopics)}

    Constraints:
    1. Plan from today (${new Date().toISOString().split('T')[0]}) until the Exam Date.
    2. Include Daily study slots based on ${state.dailyHours} hours.
    3. Every 7th day should be primarily Revision.
    4. Every 30th day (or suitable interval) should be a Mock Test checkpoint.
    5. Include Buffer days for backlogs.
    6. Ensure balanced workload. Don't overload the student.
    7. Generate a maximum of 45 days of plan (or until exam if sooner) to keep the response size manageable for this demo. If the exam is far, just plan the first 45 days.

    Output Format: JSON Array of "Day" objects.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Using Pro for better reasoning on scheduling
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 2048 }, // Enable thinking for better planning
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              day: { type: Type.INTEGER },
              date: { type: Type.STRING },
              isRevision: { type: Type.BOOLEAN },
              isTest: { type: Type.BOOLEAN },
              isBuffer: { type: Type.BOOLEAN },
              notes: { type: Type.STRING },
              slots: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    subject: { type: Type.STRING },
                    topic: { type: Type.STRING },
                    durationMinutes: { type: Type.INTEGER },
                    activityType: { type: Type.STRING, enum: ['Study', 'Revision', 'Test', 'Buffer'] }
                  }
                }
              }
            }
          }
        }
      }
    });

    const calendar = JSON.parse(response.text || '[]');
    return calendar;
  } catch (error) {
    console.error("Error generating calendar:", error);
    throw new Error("Failed to generate calendar. Please try again.");
  }
};
