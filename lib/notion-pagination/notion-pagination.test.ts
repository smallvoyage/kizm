import type {
  PageObjectResponse,
  PartialPageObjectResponse,
  QueryDataSourceResponse,
} from "@notionhq/client"
import { describe, expect, test, vi } from "vitest"

import { queryAllFullPages } from "@/lib/notion-pagination/notion-pagination"

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
    const firstPage = Array.from({ length: 100 }, (_, index) =>
      createFullPage(`page-${index + 1}`)
    )
    const query = vi.fn(async ({ start_cursor: startCursor }) =>
      startCursor === "next-page"
        ? createResponse([createFullPage("page-101")], null)
        : createResponse(firstPage, "next-page")
    )

    const pages = await queryAllFullPages(query, {
      data_source_id: "data-source-id",
      page_size: 100,
    })

    expect(pages).toHaveLength(101)
    expect(pages.at(-1)?.id).toBe("page-101")
    expect(query).toHaveBeenNthCalledWith(1, {
      data_source_id: "data-source-id",
      page_size: 100,
      start_cursor: undefined,
    })
    expect(query).toHaveBeenNthCalledWith(2, {
      data_source_id: "data-source-id",
      page_size: 100,
      start_cursor: "next-page",
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
