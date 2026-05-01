export type CategoryId =
  | 'food_drink'
  | 'professional'
  | 'service_guests'
  | 'industry_culture'
  | 'fun_reallife'
  | 'labor_law';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Question {
  id: string;
  category: CategoryId;
  question: string;
  answers: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  difficulty: Difficulty;
}

export interface Category {
  id: CategoryId;
  name: string;
  icon: string;
  color: string;
  description: string;
}

export interface GameResult {
  categoryId: CategoryId;
  totalQuestions: number;
  correctAnswers: number;
  totalScore: number;
  date: string;
}

export type AuthStackParamList = {
  Onboarding: undefined;
  Auth: undefined;
};

export type RootStackParamList = {
  Home: undefined;
  Game: {
    categoryId: CategoryId;
    challengeMode?: 'create' | 'join';
    challengeId?: string;
    questionIds?: string[];
  };
  Result: {
    categoryId: CategoryId;
    totalQuestions: number;
    correctAnswers: number;
    totalScore: number;
    isNewHighscore: boolean;
    previousHighscore: number;
  };
  Leaderboard: { categoryId?: CategoryId };
  CreateQuestion: undefined;
  ChallengeLobby: undefined;
  Admin: undefined;
  ChallengeResult: {
    mode: 'create' | 'join';
    categoryId: CategoryId;
    myScore: number;
    challengeCode?: string;
    challengerName?: string;
    challengerScore?: number;
  };
};
