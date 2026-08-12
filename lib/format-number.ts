type FormatNumberOptions = {
  fractionDigits?: number
  fixed?: boolean
}

export function formatNumber(
  value: number,
  { fractionDigits = 1, fixed = false }: FormatNumberOptions = {}
): string {
  return new Intl.NumberFormat("ja-JP", {
    minimumFractionDigits:
      fixed || !Number.isInteger(value) ? fractionDigits : 0,
    maximumFractionDigits: fractionDigits,
  }).format(value)
}
