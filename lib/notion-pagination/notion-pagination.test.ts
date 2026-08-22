import type {
  PageObjectResponse,
  PartialPageObjectResponse,
  QueryDataSourceResponse,
} from "@notionhq/client"
import { describe, expect, test, vi } from "vitest"
import { queryAllFullPages } from "@/lib/notion-pagination/notion-pagination"
import {
  notionPaginationResponseFixture,
  PAGINATION_FIXTURE_CURSOR,
} from "@/lib/notion-pagination/notion-pagination-fixture"

function createFullPage(id: string): PageObjectResponse {
  return {
    object: "page",
    id,
    url: `https://notion.so/${id}`,
  } as PageObjectResponse
}

function createPartialPage(id: string): PartialPageObjectResponse {
  return { object: "page", id } as PartialPageObjectResponse
}

function createResponse(
  results: QueryDataSourceResponse["results"],
  nextCursor: string | null
): QueryDataSourceResponse {
  return {
    object: "list",
    type: "page_or_data_source",
    page_or_data_source: {},
    results,
    has_more: nextCursor !== null,
    next_cursor: nextCursor,
  }
}

describe("queryAllFullPages", () => {
  test("cursorを最後まで辿って100件を超えるpageを返す", async () => {
    const [firstResponse, finalResponse] = notionPaginationResponseFixture
    const query = vi.fn(async ({ start_cursor: startCursor }) =>
      startCursor === PAGINATION_FIXTURE_CURSOR ? finalResponse : firstResponse
    )

    const pages = await queryAllFullPages(query, {
      data_source_id: "data-source-id",
      page_size: 100,
    })

    expect(pages.map(({ id }) => id)).toEqual(
      Array.from(
        { length: 101 },
        (_, index) => `pagination-fixture-page-${index + 1}`
      )
    )
    expect(query).toHaveBeenCalledTimes(2)
    expect(query).toHaveBeenNthCalledWith(1, {
      data_source_id: "data-source-id",
      page_size: 100,
      start_cursor: undefined,
    })
    expect(query).toHaveBeenNthCalledWith(2, {
      data_source_id: "data-source-id",
      page_size: 100,
      start_cursor: PAGINATION_FIXTURE_CURSOR,
    })
  })

  test("partial pageを除外してfull pageだけを返す", async () => {
    const query = vi.fn(async () =>
      createResponse(
        [createPartialPage("partial-page"), createFullPage("full-page")],
        null
      )
    )

    const pages = await queryAllFullPages(query, {
      data_source_id: "data-source-id",
    })

    expect(pages.map(({ id }) => id)).toEqual(["full-page"])
  })
})
