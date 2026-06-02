export const PROJECT_COLORS = [
  { key: 'green',  hex: '#22d45f', bg: 'rgba(34, 212, 95, 0.12)' },
  { key: 'blue',   hex: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' },
  { key: 'amber',  hex: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
  { key: 'red',    hex: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' },
  { key: 'purple', hex: '#a855f7', bg: 'rgba(168, 85, 247, 0.12)' },
  { key: 'grey',   hex: '#6b7280', bg: 'rgba(107, 114, 128, 0.12)' },
] as const

export type ProjectColorKey = typeof PROJECT_COLORS[number]['key']

const hexMap = Object.fromEntries(PROJECT_COLORS.map((c) => [c.key, c.hex]))
const bgMap  = Object.fromEntries(PROJECT_COLORS.map((c) => [c.key, c.bg]))

export function projectHex(color: string): string { return hexMap[color] ?? '#6b7280' }
export function projectBg(color: string): string  { return bgMap[color]  ?? 'rgba(107, 114, 128, 0.12)' }

export default function ProjectPill({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
      style={{ background: projectBg(color), color: projectHex(color) }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: projectHex(color) }} />
      {name}
    </span>
  )
}
