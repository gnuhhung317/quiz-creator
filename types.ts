
export type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'Mixed';
export type Language = 'en' | 'vi';

export interface Question {
  id: string;
  type: 'single' | 'multiple';
  question: string;
  options: string[];
  correctIndices: number[]; // Array to support one or more correct answers
  explanation: string;
  difficulty?: string;
}

export interface Quiz {
  title: string;
  questions: Question[];
  isRetry?: boolean; // Track if this is a subset/retry quiz
}

export type QuizState = 'IDLE' | 'LOADING' | 'PLAYING' | 'FINISHED';

export interface LoadingStatus {
  currentBatch: number;
  totalBatches: number;
  message: string;
}
