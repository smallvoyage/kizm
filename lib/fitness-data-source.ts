import "server-only"

import {
  resolveFitnessDataSource,
  resolveFitnessFixtureScenario,
} from "@/lib/fitness-data-source-config"
import {
  allErrorFixtureFitnessDataSource,
  emptyFixtureFitnessDataSource,
  fixtureFitnessDataSource,
  missingNutritionFixtureFitnessDataSource,
  workoutsErrorFixtureFitnessDataSource,
} from "@/lib/fixture"
import { notionFitnessDataSource } from "@/lib/notion"

const fixtureFitnessDataSources = {
  "all-error": allErrorFixtureFitnessDataSource,
  empty: emptyFixtureFitnessDataSource,
  "missing-nutrition": missingNutritionFixtureFitnessDataSource,
  normal: fixtureFitnessDataSource,
  "workouts-error": workoutsErrorFixtureFitnessDataSource,
}

const dataSourceName = resolveFitnessDataSource(process.env)

export const fitnessDataSource =
  dataSourceName === "fixture"
    ? fixtureFitnessDataSources[resolveFitnessFixtureScenario(process.env)]
    : notionFitnessDataSource
