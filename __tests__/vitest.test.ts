import { expect, test } from "vitest"
import { formatNumber } from "@/lib/format-number"

test("TypeScript path aliasを解決して純粋関数を実行できる", () => {
  expect(formatNumber(12.3)).toBe("12.3")
})
