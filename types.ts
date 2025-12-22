export enum BoardType {
  CBSE = 'CBSE',
  ICSE = 'ICSE',
  MAHARASHTRA = 'Maharashtra State Board',
  STATE = 'State Board',
}

export interface User {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export interface UserState {
  step: number;
  board: BoardType | null;
  stateName: string;
  grade: string;
  selectedSubjects: string[];
  syllabusTopics: Record<string, string[]>; // subject -> topics
  examDate: string;
  dailyHours: number;
  weakSubjects: string[];
  strongSubjects: string[];
  generatedCalendar: CalendarDay[] | null;
}

export interface CalendarDay {
  day: number;
  date: string; // ISO string or simple date string
  isRevision: boolean;
  isTest: boolean;
  isBuffer: boolean;
  slots: StudySlot[];
  notes?: string;
}

export interface StudySlot {
  subject: string;
  topic: string;
  durationMinutes: number;
  activityType: 'Study' | 'Revision' | 'Test' | 'Buffer';
}

export const GRADES = [
  "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"
];