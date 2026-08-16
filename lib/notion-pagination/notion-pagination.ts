import {
  collectPaginatedAPI,
  isFullPage,
  type PageObjectResponse,
  type QueryDataSourceParameters,
  type QueryDataSourceResponse,
} from "@notionhq/client"

type QueryDataSource = (
  args: QueryDataSourceParameters
) => Promise<QueryDataSourceResponse>

export async function queryAllFullPages(
  query: QueryDataSource,
  args: QueryDataSourceParameters
): Promise<PageObjectResponse[]> {
  const results = await collectPaginatedAPI(query, args)

  return results.filter(isFullPage)
}
