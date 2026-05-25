import { SEGMENTS, buildTableMap, buildRpcMap } from '@quizine/config'

export type AppId = string

const appId: AppId = (process.env.EXPO_PUBLIC_APP_ID ?? 'quizine') as AppId

// Build TABLE_MAPS and RPC_MAPS from the segment registry — no manual strings.
const TABLE_MAPS = Object.fromEntries(
  SEGMENTS.map(seg => [seg.id, buildTableMap(seg.tablePrefix)]),
) as Record<string, ReturnType<typeof buildTableMap>>

const RPC_MAPS = Object.fromEntries(
  SEGMENTS.map(seg => [seg.id, buildRpcMap(seg.id)]),
) as Record<string, ReturnType<typeof buildRpcMap>>

// Index segments by areaKey for fast tablesForArea() lookups
const AREA_TO_SEGMENT = Object.fromEntries(
  SEGMENTS.map(seg => [seg.areaKey, seg.id]),
)

export const APP_ID: AppId = appId
export const TABLES = TABLE_MAPS[appId] ?? TABLE_MAPS['quizine']
export const RPCS = RPC_MAPS[appId] ?? RPC_MAPS['quizine']

/** Returns the right table set for a given user area at runtime. */
export function tablesForArea(area: string) {
  const segId = AREA_TO_SEGMENT[area] ?? 'quizine'
  return TABLE_MAPS[segId] ?? TABLE_MAPS['quizine']
}
