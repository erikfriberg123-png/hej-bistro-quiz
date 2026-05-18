import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CategoryId, Question, GameResult } from '../types';
import { fetchRemoteQuestions } from '../lib/remoteQuestions';
import { type Area, DEFAULT_AREA } from '../lib/branding';
import { calculateScore } from '../utils/scoring';
import { shuffle } from '../utils/shuffle';

interface GameState {
  selectedCategory: CategoryId | null;
  questions: Question[];
  currentQuestionIndex: number;
  score: number;
  answers: (boolean | null)[];

  highscores: Record<CategoryId, number>;
  survivalHighscores: Record<string, number>;
  streak: number;
  lastPlayedDate: string;
  customQuestions: Question[];
  remoteQuestions: Question[];
  currentArea: Area;

  startGame: (categoryId: CategoryId, count?: number) => void;
  startChallengeGame: (categoryId: CategoryId, questionIds: string[]) => void;
  loadRemoteQuestions: (area?: Area) => Promise<void>;
  setCurrentArea: (area: Area) => void;
  submitAnswer: (answerIndex: number, timeRemaining: number) => number;
  nextQuestion: () => void;
  endGame: () => { result: GameResult; isNewHighscore: boolean; previousHighscore: number };
  checkSurvivalHighscore: (categoryId: string, score: number) => { isNewHighscore: boolean; previousHighscore: number };
  resetGame: () => void;
  checkStreak: () => void;
  addCustomQuestion: (q: Question) => void;
  deleteCustomQuestion: (id: string) => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      selectedCategory: null,
      questions: [],
      currentQuestionIndex: 0,
      score: 0,
      answers: [],

      highscores: {
        food: 0,
        drink: 0,
        famous_profiles: 0,
        professional: 0,
        service_guests: 0,
        industry_culture: 0,
        fun_reallife: 0,
        labor_law: 0,
        food_cost: 0,
        scheduling_labor: 0,
        guest_psychology: 0,
        service_pressure: 0,
      },
      survivalHighscores: {},
      streak: 0,
      lastPlayedDate: '',
      customQuestions: [],
      remoteQuestions: [],
      currentArea: DEFAULT_AREA,

      setCurrentArea: (area) => set({ currentArea: area }),

      loadRemoteQuestions: async (area) => {
        const targetArea = area ?? get().currentArea;
        const questions = await fetchRemoteQuestions(targetArea);
        set({ remoteQuestions: questions, currentArea: targetArea });
      },

      startGame: (categoryId, count = 10) => {
        const allQuestions = [...get().remoteQuestions, ...get().customQuestions];
        const pool = allQuestions.filter(q => q.category === categoryId);
        const selected = shuffle(pool).slice(0, count);
        set({
          selectedCategory: categoryId,
          questions: selected,
          currentQuestionIndex: 0,
          score: 0,
          answers: new Array(selected.length).fill(null),
        });
      },

      startChallengeGame: (categoryId, questionIds) => {
        const allQuestions = [...get().remoteQuestions, ...get().customQuestions];
        const ordered = questionIds
          .map(id => allQuestions.find(q => q.id === id))
          .filter((q): q is Question => q !== undefined);
        set({
          selectedCategory: categoryId,
          questions: ordered,
          currentQuestionIndex: 0,
          score: 0,
          answers: new Array(ordered.length).fill(null),
        });
      },

      submitAnswer: (answerIndex, timeRemaining) => {
        const { questions, currentQuestionIndex, score, answers } = get();
        const question = questions[currentQuestionIndex];
        const isCorrect = answerIndex === question.correctIndex;
        const points = calculateScore(isCorrect, timeRemaining);

        const newAnswers = [...answers];
        newAnswers[currentQuestionIndex] = isCorrect;

        set({ score: score + points, answers: newAnswers });
        return points;
      },

      nextQuestion: () => {
        const { currentQuestionIndex } = get();
        set({ currentQuestionIndex: currentQuestionIndex + 1 });
      },

      endGame: () => {
        const { selectedCategory, questions, score, answers, highscores, streak, lastPlayedDate } = get();
        const correctAnswers = answers.filter(a => a === true).length;

        const result: GameResult = {
          categoryId: selectedCategory!,
          totalQuestions: questions.length,
          correctAnswers,
          totalScore: score,
          date: new Date().toISOString(),
        };

        const previousHighscore = highscores[selectedCategory!] ?? 0;
        const isNewHighscore = score > previousHighscore;

        const newHighscores = { ...highscores };
        if (isNewHighscore) {
          newHighscores[selectedCategory!] = score;
        }

        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        let newStreak = streak;
        if (lastPlayedDate === today) {
          // already played today
        } else if (lastPlayedDate === yesterday || lastPlayedDate === '') {
          newStreak = streak + 1;
        } else {
          newStreak = 1;
        }

        set({ highscores: newHighscores, streak: newStreak, lastPlayedDate: today });

        return { result, isNewHighscore, previousHighscore };
      },

      checkSurvivalHighscore: (categoryId, score) => {
        const { survivalHighscores } = get();
        const previousHighscore = survivalHighscores[categoryId] ?? 0;
        const isNewHighscore = score > previousHighscore;
        if (isNewHighscore) {
          set({ survivalHighscores: { ...survivalHighscores, [categoryId]: score } });
        }
        return { isNewHighscore, previousHighscore };
      },

      resetGame: () => {
        set({
          selectedCategory: null,
          questions: [],
          currentQuestionIndex: 0,
          score: 0,
          answers: [],
        });
      },

      checkStreak: () => {
        const { lastPlayedDate, streak } = get();
        if (!lastPlayedDate || streak === 0) return;
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        const today = new Date().toISOString().split('T')[0];
        if (lastPlayedDate !== today && lastPlayedDate !== yesterday) {
          set({ streak: 0 });
        }
      },

      addCustomQuestion: (q) => {
        set(state => ({ customQuestions: [...state.customQuestions, q] }));
      },

      deleteCustomQuestion: (id) => {
        set(state => ({ customQuestions: state.customQuestions.filter(q => q.id !== id) }));
      },
    }),
    {
      name: 'hej-bistro-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        highscores: state.highscores,
        survivalHighscores: state.survivalHighscores,
        streak: state.streak,
        lastPlayedDate: state.lastPlayedDate,
        customQuestions: state.customQuestions,
      }),
    }
  )
);
