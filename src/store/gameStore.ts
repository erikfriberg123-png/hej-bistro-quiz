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
  customQuestions: Question[];
  remoteQuestions: Question[];
  currentArea: Area;

  startGame: (categoryId: CategoryId, count?: number) => void;
  startChallengeGame: (categoryId: CategoryId, questionIds: string[]) => void;
  startChallengeGameWithQuestions: (categoryId: CategoryId, questions: Question[]) => void;
  loadRemoteQuestions: (area?: Area) => Promise<void>;
  setCurrentArea: (area: Area) => void;
  submitAnswer: (answerIndex: number, timeRemaining: number) => number;
  nextQuestion: () => void;
  endGame: () => { result: GameResult; isNewHighscore: boolean; previousHighscore: number };
  checkSurvivalHighscore: (categoryId: string, score: number) => { isNewHighscore: boolean; previousHighscore: number };
  resetGame: () => void;
  addCustomQuestion: (q: Question) => void;
  deleteCustomQuestion: (id: string) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;

  soundEnabled: boolean;
  hapticsEnabled: boolean;
  muteTimerTicks: boolean;
  setSoundEnabled: (val: boolean) => void;
  setHapticsEnabled: (val: boolean) => void;
  setMuteTimerTicks: (val: boolean) => void;
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
        bildspel: 0,
        anatomy_body: 0,
        diagnoses_symptoms: 0,
        emergency_firstaid: 0,
        ethics_communication: 0,
        infections_hygiene: 0,
        medical_history: 0,
        medications_pharma: 0,
        popculture_healthcare: 0,
        psychiatry_psychology: 0,
      },
      survivalHighscores: {},
      customQuestions: [],
      remoteQuestions: [],
      currentArea: DEFAULT_AREA,
      isDarkMode: true,
      toggleDarkMode: () => set(s => ({ isDarkMode: !s.isDarkMode })),

      soundEnabled: true,
      hapticsEnabled: true,
      muteTimerTicks: false,
      setSoundEnabled: (val) => set({ soundEnabled: val }),
      setHapticsEnabled: (val) => set({ hapticsEnabled: val }),
      setMuteTimerTicks: (val) => set({ muteTimerTicks: val }),

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

      startChallengeGameWithQuestions: (categoryId, questions) => {
        set({
          selectedCategory: categoryId,
          questions,
          currentQuestionIndex: 0,
          score: 0,
          answers: new Array(questions.length).fill(null),
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
        const { selectedCategory, questions, score, answers, highscores } = get();
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

        set({ highscores: newHighscores });

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
        customQuestions: state.customQuestions,
        currentArea: state.currentArea,
        isDarkMode: state.isDarkMode,
        soundEnabled: state.soundEnabled,
        hapticsEnabled: state.hapticsEnabled,
        muteTimerTicks: state.muteTimerTicks,
      }),
    }
  )
);
