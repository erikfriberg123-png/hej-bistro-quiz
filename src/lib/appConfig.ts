export type AppId = 'quizine' | 'voo' | 'it' | 'blaljus' | 'handel'

const appId = (process.env.EXPO_PUBLIC_APP_ID ?? 'quizine') as AppId

const TABLE_MAPS = {
  quizine: {
    questions:    'remote_questions',
    tofQuestions: 'truth_or_false_questions',
    battles:      'battles',
    challenges:   'challenges',
    feedback:     'feedback',
    stories:      'restaurant_stories',
    submissions:  'submitted_questions',
    complaints:   'question_complaints',
    scores:       'scores',
    attempts:     'question_attempts',
    leaderboard:  'leaderboard',
  },
  voo: {
    questions:    'voo_remote_questions',
    tofQuestions: 'voo_truth_or_false_questions',
    battles:      'voo_battles',
    challenges:   'voo_challenges',
    feedback:     'voo_feedback',
    stories:      'voo_restaurant_stories',
    submissions:  'voo_submitted_questions',
    complaints:   'voo_question_complaints',
    scores:       'voo_scores',
    attempts:     'voo_question_attempts',
    leaderboard:  'voo_leaderboard',
  },
  it: {
    questions:    'it_remote_questions',
    tofQuestions: 'it_truth_or_false_questions',
    battles:      'it_battles',
    challenges:   'it_challenges',
    feedback:     'it_feedback',
    stories:      'it_restaurant_stories',
    submissions:  'it_submitted_questions',
    complaints:   'it_question_complaints',
    scores:       'it_scores',
    attempts:     'it_question_attempts',
    leaderboard:  'it_leaderboard',
  },
  blaljus: {
    questions:    'blaljus_remote_questions',
    tofQuestions: 'blaljus_truth_or_false_questions',
    battles:      'blaljus_battles',
    challenges:   'blaljus_challenges',
    feedback:     'blaljus_feedback',
    stories:      'blaljus_restaurant_stories',
    submissions:  'blaljus_submitted_questions',
    complaints:   'blaljus_question_complaints',
    scores:       'blaljus_scores',
    attempts:     'blaljus_question_attempts',
    leaderboard:  'blaljus_leaderboard',
  },
  handel: {
    questions:    'handel_remote_questions',
    tofQuestions: 'handel_truth_or_false_questions',
    battles:      'handel_battles',
    challenges:   'handel_challenges',
    feedback:     'handel_feedback',
    stories:      'handel_restaurant_stories',
    submissions:  'handel_submitted_questions',
    complaints:   'handel_question_complaints',
    scores:       'handel_scores',
    attempts:     'handel_question_attempts',
    leaderboard:  'handel_leaderboard',
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
  it: {
    questionStats: 'it_get_question_stats',
    battlesPerDay: 'it_get_battles_per_day',
  },
  blaljus: {
    questionStats: 'blaljus_get_question_stats',
    battlesPerDay: 'blaljus_get_battles_per_day',
  },
  handel: {
    questionStats: 'handel_get_question_stats',
    battlesPerDay: 'handel_get_battles_per_day',
  },
} as const

export const APP_ID: AppId = appId
export const TABLES = TABLE_MAPS[appId]
export const RPCS = RPC_MAPS[appId]

export function tablesForArea(area: string) {
  if (area === 'sjukvard') return TABLE_MAPS.voo;
  if (area === 'it') return TABLE_MAPS.it;
  if (area === 'blaljus') return TABLE_MAPS.blaljus;
  if (area === 'handel') return TABLE_MAPS.handel;
  return TABLE_MAPS.quizine;
}
