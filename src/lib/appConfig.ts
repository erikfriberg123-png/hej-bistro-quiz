export type AppId = 'quizine' | 'voo'

const appId = (process.env.EXPO_PUBLIC_APP_ID ?? 'quizine') as AppId

const TABLE_MAPS = {
  quizine: {
    questions:   'remote_questions',
    battles:     'battles',
    challenges:  'challenges',
    feedback:    'feedback',
    stories:     'restaurant_stories',
    submissions: 'submitted_questions',
    complaints:  'question_complaints',
    scores:      'scores',
    attempts:    'question_attempts',
    leaderboard: 'leaderboard',
  },
  voo: {
    questions:   'voo_remote_questions',
    battles:     'voo_battles',
    challenges:  'voo_challenges',
    feedback:    'voo_feedback',
    stories:     'voo_restaurant_stories',
    submissions: 'voo_submitted_questions',
    complaints:  'voo_question_complaints',
    scores:      'voo_scores',
    attempts:    'voo_question_attempts',
    leaderboard: 'voo_leaderboard',
  },
} as const

const RPC_MAPS = {
  quizine: {
    questionStats: 'get_question_stats',
    battlesPerDay: 'get_battles_per_day',
  },
  voo: {
    questionStats: 'voo_get_question_stats',
    battlesPerDay: 'voo_get_battles_per_day',
  },
} as const

export const APP_ID: AppId = appId
export const TABLES = TABLE_MAPS[appId]
export const RPCS = RPC_MAPS[appId]
