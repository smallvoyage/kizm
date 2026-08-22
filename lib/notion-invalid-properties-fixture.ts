import type {
  PageObjectResponse,
  PartialDataSourceObjectResponse,
  RichTextItemResponse,
} from "@notionhq/client"

function createDateSchemaProperty(id: string, name: string) {
  return { id, name, description: null, type: "date", date: {} } as const
}

function createNumberSchemaProperty(id: string, name: string) {
  return {
    id,
    name,
    description: null,
    type: "number",
    number: { format: "number" },
  } as const
}

function createTitleSchemaProperty(id: string, name: string) {
  return { id, name, description: null, type: "title", title: {} } as const
}

function createSelectSchemaProperty(id: string, name: string) {
  return {
    id,
    name,
    description: null,
    type: "select",
    select: { options: [] as [] },
  } as const
}

function createRichTextSchemaProperty(id: string, name: string) {
  return {
    id,
    name,
    description: null,
    type: "rich_text",
    rich_text: {},
  } as const
}

function createDataSource(
  id: string,
  properties: PartialDataSourceObjectResponse["properties"]
): PartialDataSourceObjectResponse {
  return { object: "data_source", id, properties }
}

const validDaysSchemaProperties = {
  "Log Date": createDateSchemaProperty("log-date", "Log Date"),
  "Weight kg": createNumberSchemaProperty("weight", "Weight kg"),
  "Body Fat %": createNumberSchemaProperty("body-fat", "Body Fat %"),
  "Muscle Mass kg": createNumberSchemaProperty("muscle-mass", "Muscle Mass kg"),
} satisfies PartialDataSourceObjectResponse["properties"]

const validWorkoutsSchemaProperties = {
  "Exercised Day": createTitleSchemaProperty("exercised-day", "Exercised Day"),
  Category: createSelectSchemaProperty("category", "Category"),
  Exercise: createSelectSchemaProperty("exercise", "Exercise"),
  "Weight kg": createRichTextSchemaProperty("weight", "Weight kg"),
  Reps: createNumberSchemaProperty("reps", "Reps"),
  "Set Count": createNumberSchemaProperty("set-count", "Set Count"),
} satisfies PartialDataSourceObjectResponse["properties"]

export const invalidNotionDataSourceFixtures = {
  daysMissingRequiredProperty: createDataSource("days-missing-required", {
    "Log Date": validDaysSchemaProperties["Log Date"],
    "Weight kg": validDaysSchemaProperties["Weight kg"],
    "Body Fat %": validDaysSchemaProperties["Body Fat %"],
  }),
  workoutsMissingRequiredProperty: createDataSource(
    "workouts-missing-required",
    {
      "Exercised Day": validWorkoutsSchemaProperties["Exercised Day"],
      Category: validWorkoutsSchemaProperties.Category,
      Exercise: validWorkoutsSchemaProperties.Exercise,
      "Weight kg": validWorkoutsSchemaProperties["Weight kg"],
      Reps: validWorkoutsSchemaProperties.Reps,
    }
  ),
  daysMismatchedPropertyType: createDataSource("days-mismatched-type", {
    ...validDaysSchemaProperties,
    "Log Date": createTitleSchemaProperty("log-date", "Log Date"),
  }),
  workoutsMismatchedPropertyType: createDataSource("workouts-mismatched-type", {
    ...validWorkoutsSchemaProperties,
    Reps: createRichTextSchemaProperty("reps", "Reps"),
  }),
} as const

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

function createWorkoutPage(
  id: string,
  values: { date: string; weight: string; reps: number }
): PageObjectResponse {
  const properties = {
    "Exercised Day": {
      id: "exercised-day",
      type: "title",
      title: [createText(values.date)],
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
      rich_text: [createText(values.weight)],
    },
    Reps: { id: "reps", type: "number", number: values.reps },
    "Set Count": { id: "set-count", type: "number", number: 3 },
  } satisfies PageObjectResponse["properties"]

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
      data_source_id: "workouts-data-source",
      database_id: "fitness-database",
    },
    properties,
    icon: null,
    cover: null,
    created_by: { object: "user", id: "fixture-user" },
    last_edited_by: { object: "user", id: "fixture-user" },
  }
}

export const invalidNotionWorkoutPageFixtures = {
  invalidDate: createWorkoutPage("workout-invalid-date", {
    date: "2026-02-30",
    weight: "80",
    reps: 8,
  }),
  invalidWeight: createWorkoutPage("workout-invalid-weight", {
    date: "2026-08-20",
    weight: "heavy",
    reps: 8,
  }),
  invalidReps: createWorkoutPage("workout-invalid-reps", {
    date: "2026-08-20",
    weight: "80",
    reps: 0,
  }),
} as const
