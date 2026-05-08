export type CategoryId =
  | 'food'
  | 'drink'
  | 'famous_profiles'
  | 'professional'
  | 'service_guests'
  | 'industry_culture'
  | 'fun_reallife'
  | 'labor_law'
  | 'food_cost'
  | 'scheduling_labor'
  | 'guest_psychology'
  | 'service_pressure';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Question {
  id: string;
  category: CategoryId;
  question: string;
  answers: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  difficulty: Difficulty;
  active?: boolean;
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
    targetFriendId?: string;
    targetFriendName?: string;
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
  ChallengeLobby: {
    preselectedFriendId?: string;
    preselectedFriendName?: string;
  };
  ChallengeResult: {
    mode: 'create' | 'join';
    categoryId: CategoryId;
    myScore: number;
    challengeCode?: string;
    challengerName?: string;
    challengerScore?: number;
    targetFriendName?: string;
  };
  BattlePickCategory: {
    battleId: string;
    code: string;
    role: 'creator' | 'opponent';
    roundNumber: number;
    creatorScore: number;
    opponentScore: number;
    creatorName: string;
    opponentName: string;
  };
  BattleRound: {
    battleId: string;
    code: string;
    role: 'creator' | 'opponent';
    roundNumber: number;
    category: CategoryId;
    creatorScore: number;
    opponentScore: number;
    creatorName: string;
    opponentName: string;
    questionIds?: string[];
  };
  BattleBoard: {
    battleId: string;
    code: string;
    role: 'creator' | 'opponent';
    lastRoundCorrect?: number;
    lastRoundTotal?: number;
    lastRoundResults?: boolean[];
  };
  BattleResult: {
    battleId: string;
    role: 'creator' | 'opponent';
    creatorScore: number;
    opponentScore: number;
    creatorName: string;
    opponentName: string;
    winner: 'creator' | 'opponent' | 'draw';
    totalRounds: number;
  };
  Friends: undefined;
  Admin: undefined;
};
