export const DEFAULT_CHART_POINT_INTERVAL = 56
export const MIN_CHART_POINT_INTERVAL = 32
export const MAX_CHART_POINT_INTERVAL = 96

export function calculatePinchPointInterval({
  initialDistance,
  currentDistance,
  initialInterval,
}: {
  initialDistance: number
  currentDistance: number
  initialInterval: number
}) {
  if (initialDistance <= 0 || currentDistance <= 0) {
    return initialInterval
  }

  return Math.min(
    MAX_CHART_POINT_INTERVAL,
    Math.max(
      MIN_CHART_POINT_INTERVAL,
      Math.round(initialInterval * (currentDistance / initialDistance))
    )
  )
}
