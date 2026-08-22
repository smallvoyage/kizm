import type { PageObjectResponse, RichTextItemResponse } from "@notionhq/client"

const DEFAULT_ANNOTATIONS = {
  bold: false,
  italic: false,
  strikethrough: false,
  underline: false,
  code: false,
  color: "default",
} as const

function createText(content: string): RichTextItemResponse {
  return {
    type: "text",
    text: { content, link: null },
    annotations: DEFAULT_ANNOTATIONS,
    plain_text: content,
    href: null,
  }
}

function createPage(
  id: string,
  properties: PageObjectResponse["properties"]
): PageObjectResponse {
  return {
    object: "page",
    id,
    created_time: "2026-08-20T00:00:00.000Z",
    last_edited_time: "2026-08-20T00:00:00.000Z",
    in_trash: false,
    archived: false,
    is_archived: false,
    is_locked: false,
    url: `https://notion.so/${id}`,
    public_url: null,
    parent: {
      type: "data_source_id",
      data_source_id: "fitness-data-source",
      database_id: "fitness-database",
    },
    properties,
    icon: null,
    cover: null,
    created_by: { object: "user", id: "fixture-user" },
    last_edited_by: { object: "user", id: "fixture-user" },
  }
}

function createDateProperty(start: string) {
  return {
    id: "log-date",
    type: "date",
    date: { start, end: null, time_zone: null },
  } as const
}

function createNumberProperty(id: string, number: number) {
  return { id, type: "number", number } as const
}

function createRollupNumberProperty(id: string, number: number) {
  return {
    id,
    type: "rollup",
    rollup: { type: "number", number, function: "sum" },
  } as const
}

function createWorkoutPage(
  id: string,
  values: { dateParts: string[]; weightParts: string[] }
) {
  return createPage(id, {
    "Exercised Day": {
      id: "exercised-day",
      type: "title",
      title: values.dateParts.map(createText),
    },
    Category: {
      id: "category",
      type: "select",
      select: { id: "strength", name: "筋力", color: "blue" },
    },
    Exercise: {
      id: "exercise",
      type: "select",
      select: { id: "bench-press", name: "ベンチプレス", color: "red" },
    },
    "Weight kg": {
      id: "weight",
      type: "rich_text",
      rich_text: values.weightParts.map(createText),
    },
    Reps: createNumberProperty("reps", 8),
    "Set Count": createNumberProperty("set-count", 3),
  })
}

export const notionMapperPageFixtures = {
  days: {
    numberAndRollup: createPage("day-number-and-rollup", {
      "Log Date": createDateProperty("2026-08-21T00:00:00.000+09:00"),
      Steps: createNumberProperty("steps", 12_345),
      "Total Calories": createRollupNumberProperty("calories", 2_150),
      "Total Protein g": createRollupNumberProperty("protein", 135),
      "Total Fat g": createNumberProperty("fat", 62),
      "Total Carbs g": createRollupNumberProperty("carbs", 240),
      "Weight kg": createNumberProperty("weight", 71.4),
      "Body Fat %": createRollupNumberProperty("body-fat", 18.2),
      "Muscle Mass kg": createNumberProperty("muscle-mass", 54.8),
    }),
    legacyProtein: createPage("day-legacy-protein", {
      "Log Date": createDateProperty("2026-08-22"),
      "Total Protein": createNumberProperty("legacy-protein", 128),
    }),
    invalidDate: createPage("day-invalid-date", {
      "Log Date": createDateProperty("2026-02-30"),
    }),
  },
  workouts: {
    richTextWeightAndTitleDate: createWorkoutPage("workout-normalized", {
      dateParts: ["2026-08-", "20T09:30:00.000+09:00"],
      weightParts: ["82", ".5"],
    }),
    invalidWeight: createWorkoutPage("workout-invalid-weight", {
      dateParts: ["2026-08-20"],
      weightParts: ["heavy"],
    }),
  },
} as const
