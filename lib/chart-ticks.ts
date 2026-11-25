const STEPS = [1, 2, 2.5, 5, 10, 20, 25, 50, 100]
const MAX_INTERVALS = 5

/**
 * 値の範囲を上下に余白付きで覆う、等間隔で切りの良い目盛りを返す。
 */
export function getNiceTicks(values: number[]): number[] {
  if (values.length === 0) return []

  const min = Math.min(...values)
  const max = Math.max(...values)
  const step =
    STEPS.find((candidate) => {
      const start = Math.floor((min - candidate / 2) / candidate)
      const end = Math.ceil((max + candidate / 2) / candidate)
      return end - start <= MAX_INTERVALS
    }) ?? Math.ceil((max - min) / MAX_INTERVALS / 100) * 100
  const start = Math.max(0, Math.floor((min - step / 2) / step) * step)
  const end = Math.ceil((max + step / 2) / step) * step

  return Array.from(
    { length: Math.round((end - start) / step) + 1 },
    (_, index) => start + index * step
  )
}
