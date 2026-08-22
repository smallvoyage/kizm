import type {
  PageObjectResponse,
  PartialPageObjectResponse,
  QueryDataSourceResponse,
} from "@notionhq/client"

export const PAGINATION_FIXTURE_CURSOR = "pagination-fixture-page-2"

function createFullPage(id: string): PageObjectResponse {
  return {
    object: "page",
    id,
    url: `https://notion.so/${id}`,
  } as PageObjectResponse
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

const firstPageResults = [
  ...Array.from({ length: 100 }, (_, index) =>
    createFullPage(`pagination-fixture-page-${index + 1}`)
  ),
  {
    object: "page",
    id: "pagination-fixture-partial-page",
  } satisfies PartialPageObjectResponse,
]

export const notionPaginationResponseFixture = [
  createResponse(firstPageResults, PAGINATION_FIXTURE_CURSOR),
  createResponse([createFullPage("pagination-fixture-page-101")], null),
] as const satisfies readonly QueryDataSourceResponse[]
