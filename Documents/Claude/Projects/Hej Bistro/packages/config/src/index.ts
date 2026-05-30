export * from './categories'

/**
 * @quizine/config — single source of truth for segment definitions.
 *
 * Imported by:
 *   - daily-quizine   (via Vite alias)
 *   - hej-bistro-quiz (via Metro alias + watchFolders)
 *
 * To add a new segment: add one object to SEGMENTS. Everything else derives
 * from tablePrefix and id automatically.
 */

export interface SegmentDefinition {
  id: string
  /** DB table prefix. Empty string for quizine (shares base tables). */
  tablePrefix: string
  /** Value stored in profiles.area for this segment. */
  areaKey: string
  label: string
  icon: string
  brandColor: string
  /** Admin sidebar background color. */
  adminSidebarColor: string
  /** Hidden from UIs until explicitly enabled. */
  disabled?: boolean
  /** Uses its own Supabase project instead of the shared one. */
  separateSupabase?: boolean
  /** Metadata for the daily.quizine.se build. */
  daily: {
    title: string
    description: string
  }
}

export const SEGMENTS: SegmentDefinition[] = [
  {
    id: 'quizine',
    tablePrefix: '',
    areaKey: 'krogen',
    label: 'Quizine',
    icon: '🍽️',
    brandColor: '#9B5DE5',
    adminSidebarColor: '#1E1040',
    daily: {
      title: 'Quizine Daily – Dagens quiz för restaurangfolk',
      description: 'Dagligt quiz för restaurang- och hotellpersonal. Nytt quiz varje vardag.',
    },
  },
  {
    id: 'voo',
    tablePrefix: 'voo_',
    areaKey: 'sjukvard',
    label: 'VOO',
    icon: '🏥',
    brandColor: '#36E0E0',
    adminSidebarColor: '#be185d',
    separateSupabase: true,
    daily: {
      title: 'Quizine Daily – Vård &amp; Omsorg',
      description: 'Dagens quiz för dig inom vård och omsorg. Nytt quiz varje vardag.',
    },
  },
  {
    id: 'it',
    tablePrefix: 'it_',
    areaKey: 'it',
    label: 'IT',
    icon: '💻',
    brandColor: '#00FF64',
    adminSidebarColor: '#0C130C',
    disabled: true,
    daily: {
      title: 'Quizine Daily – IT &amp; Software',
      description: 'Dagens quiz för dig inom IT och mjukvara. Nytt quiz varje vardag.',
    },
  },
  {
    id: 'blaljus',
    tablePrefix: 'blaljus_',
    areaKey: 'blaljus',
    label: 'Blåljus',
    icon: '🚨',
    brandColor: '#1A5BFF',
    adminSidebarColor: '#071428',
    disabled: true,
    daily: {
      title: 'Quizine Daily – Blåljus',
      description: 'Dagens quiz för polis, brand och ambulans. Nytt quiz varje vardag.',
    },
  },
]

export function getSegment(id: string): SegmentDefinition | undefined {
  return SEGMENTS.find(s => s.id === id)
}

// ---------------------------------------------------------------------------
// Table helpers
// ---------------------------------------------------------------------------

/** All table base-names as they exist in the DB (without prefix). */
const BASE_TABLES = {
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
} as const

export type TableMap = { [K in keyof typeof BASE_TABLES]: string }

/**
 * Build the full table-name map for a segment prefix.
 * Pass `seg.tablePrefix` (e.g. `'voo_'`, or `''` for quizine).
 */
export function buildTableMap(prefix: string): TableMap {
  return Object.fromEntries(
    Object.entries(BASE_TABLES).map(([key, table]) => [
      key,
      prefix ? `${prefix}${table}` : table,
    ]),
  ) as TableMap
}

/**
 * Build the RPC-name map for a segment.
 * Pass `seg.id` (e.g. `'voo'`, or `'quizine'`).
 */
export function buildRpcMap(segmentId: string): { questionStats: string; battlesPerDay: string } {
  const prefix = segmentId === 'quizine' ? '' : `${segmentId}_`
  return {
    questionStats: `${prefix}get_question_stats`,
    battlesPerDay: `${prefix}get_battles_per_day`,
  }
}

/**
 * Look up a single table name for a segment (used in server-side code).
 * Equivalent to `buildTableMap(prefix)[table]`.
 */
export function tableFor(prefix: string, table: string): string {
  return prefix ? `${prefix}${table}` : table
}
