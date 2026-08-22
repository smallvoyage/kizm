import { isFullPage } from "@notionhq/client"
import { describe, expect, test } from "vitest"

import {
  notionPaginationResponseFixture,
  PAGINATION_FIXTURE_CURSOR,
} from "./notion-pagination-fixture"

describe("notionPaginationResponseFixture", () => {
  test("100件を超えるfull pageとfull page以外の結果を含む", () => {
    const results = notionPaginationResponseFixture.flatMap(
      (response) => response.results
    )

    expect(results.filter(isFullPage)).toHaveLength(101)
    expect(results.some((result) => !isFullPage(result))).toBe(true)
  })

  test("継続cursorがある応答と最終応答を含む", () => {
    expect(notionPaginationResponseFixture).toMatchObject([
      {
        has_more: true,
        next_cursor: PAGINATION_FIXTURE_CURSOR,
      },
      {
        has_more: false,
        next_cursor: null,
      },
    ])
  })
})
