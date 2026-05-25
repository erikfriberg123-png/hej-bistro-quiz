import {
  getCategoriesForSegment,
  getCategoryById as getSharedCategoryById,
  SEGMENTS,
} from '@quizine/config'
import type { Category } from '../types'
import type { Area } from '../lib/branding'

// Map areaKey → segmentId for getCategoriesForArea()
const AREA_TO_SEGMENT: Record<string, string> = Object.fromEntries(
  SEGMENTS.map(s => [s.areaKey, s.id]),
)

/**
 * All category arrays are auto-derived from packages/config/src/categories.ts.
 * Adding a segment's categories there auto-populates here.
 */
export const CATEGORIES         = getCategoriesForSegment('quizine') as Category[]
export const VOO_CATEGORIES     = getCategoriesForSegment('voo')     as Category[]
export const IT_CATEGORIES      = getCategoriesForSegment('it')      as Category[]
export const BLALJUS_CATEGORIES = getCategoriesForSegment('blaljus') as Category[]

export function getCategoriesForArea(area: Area): Category[] {
  const segId = AREA_TO_SEGMENT[area] ?? 'quizine'
  return getCategoriesForSegment(segId) as Category[]
}

export function getCategoryById(id: string): Category | undefined {
  return getSharedCategoryById(id) as Category | undefined
}
