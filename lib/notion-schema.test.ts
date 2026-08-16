import { describe, expect, test } from "vitest"

import { FitnessDataError } from "@/lib/fitness-data"
import {
  validateDaysDataSourceSchema,
  validateWorkoutsDataSourceSchema,
} from "@/lib/notion-schema"

const validDaysProperties = {
  "Log Date": { type: "date" },
  "Weight kg": { type: "number" },
  "Body Fat %": { type: "number" },
  "Muscle Mass kg": { type: "number" },
}

const validWorkoutsProperties = {
  "Exercised Day": { type: "title" },
  Category: { type: "select" },
  Exercise: { type: "select" },
  "Weight kg": { type: "rich_text" },
  Reps: { type: "number" },
  "Set Count": { type: "number" },
}

describe("validateDaysDataSourceSchema", () => {
  test("必須プロパティと型が正しければ検証を通過する", () => {
    expect(() =>
      validateDaysDataSourceSchema(validDaysProperties)
    ).not.toThrow()
  })

  test("不足している必須プロパティをユーザー向けメッセージで通知する", () => {
    expect(() =>
      validateDaysDataSourceSchema({
        "Log Date": { type: "date" },
        "Weight kg": { type: "number" },
      })
    ).toThrowError(
      new FitnessDataError(
        "Notionに必要なプロパティがありません: Body Fat %, Muscle Mass kg"
      )
    )
  })

  test("不正な型をユーザー向けメッセージで通知する", () => {
    expect(() =>
      validateDaysDataSourceSchema({
        ...validDaysProperties,
        "Log Date": { type: "title" },
        "Weight kg": { type: "rich_text" },
      })
    ).toThrowError(
      new FitnessDataError(
        "Notionプロパティの型を確認してください: Log Date (date), Weight kg (number)"
      )
    )
  })
})

describe("validateWorkoutsDataSourceSchema", () => {
  test("必須プロパティと型が正しければ検証を通過する", () => {
    expect(() =>
      validateWorkoutsDataSourceSchema(validWorkoutsProperties)
    ).not.toThrow()
  })

  test("不足している必須プロパティをユーザー向けメッセージで通知する", () => {
    expect(() =>
      validateWorkoutsDataSourceSchema({
        "Exercised Day": { type: "title" },
        Category: { type: "select" },
      })
    ).toThrowError(
      new FitnessDataError(
        "NotionのWorkoutsに必要なプロパティがありません: Exercise, Weight kg, Reps, Set Count"
      )
    )
  })

  test("不正な型をユーザー向けメッセージで通知する", () => {
    expect(() =>
      validateWorkoutsDataSourceSchema({
        ...validWorkoutsProperties,
        Exercise: { type: "rich_text" },
        "Set Count": { type: "formula" },
      })
    ).toThrowError(
      new FitnessDataError(
        "NotionのWorkoutsプロパティの型を確認してください: Exercise (select), Set Count (number)"
      )
    )
  })
})
