import { describe, expect, test } from "vitest"

import { FitnessDataError } from "@/lib/fitness-data"
import {
  validateDaysDataSourceSchema,
  validateWorkoutsDataSourceSchema,
} from "./notion-schema"

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

  test("不足している必須プロパティの一覧をユーザー向けメッセージで通知する", () => {
    expect(() => validateDaysDataSourceSchema({})).toThrowError(
      new FitnessDataError(
        "Notionに必要なプロパティがありません: Log Date, Weight kg, Body Fat %, Muscle Mass kg"
      )
    )
  })

  test("型が不一致の必須プロパティと期待型をユーザー向けメッセージで通知する", () => {
    expect(() =>
      validateDaysDataSourceSchema({
        "Log Date": { type: "title" },
        "Weight kg": { type: "rich_text" },
        "Body Fat %": { type: "formula" },
        "Muscle Mass kg": { type: "rollup" },
      })
    ).toThrowError(
      new FitnessDataError(
        "Notionプロパティの型を確認してください: Log Date (date), Weight kg (number), Body Fat % (number), Muscle Mass kg (number)"
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

  test("不足している必須プロパティの一覧をユーザー向けメッセージで通知する", () => {
    expect(() => validateWorkoutsDataSourceSchema({})).toThrowError(
      new FitnessDataError(
        "NotionのWorkoutsに必要なプロパティがありません: Exercised Day, Category, Exercise, Weight kg, Reps, Set Count"
      )
    )
  })

  test("型が不一致の必須プロパティと期待型をユーザー向けメッセージで通知する", () => {
    expect(() =>
      validateWorkoutsDataSourceSchema({
        "Exercised Day": { type: "date" },
        Category: { type: "multi_select" },
        Exercise: { type: "rich_text" },
        "Weight kg": { type: "number" },
        Reps: { type: "formula" },
        "Set Count": { type: "formula" },
      })
    ).toThrowError(
      new FitnessDataError(
        "NotionのWorkoutsプロパティの型を確認してください: Exercised Day (title), Category (select), Exercise (select), Weight kg (rich_text), Reps (number), Set Count (number)"
      )
    )
  })
})
