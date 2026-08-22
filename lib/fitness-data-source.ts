import "server-only"

import {
  resolveFitnessDataSource,
  resolveFitnessFixtureScenario,
} from "@/lib/fitness-data-source-config"
import {
  emptyFixtureFitnessDataSource,
  fixtureFitnessDataSource,
  missingNutritionFixtureFitnessDataSource,
} from "@/lib/fixture"
import { notionFitnessDataSource } from "@/lib/notion"

const fixtureFitnessDataSources = {
  empty: emptyFixtureFitnessDataSource,
  "missing-nutrition": missingNutritionFixtureFitnessDataSource,
  normal: fixtureFitnessDataSource,
}

const dataSourceName = resolveFitnessDataSource(process.env)

export const fitnessDataSource =
  dataSourceName === "fixture"
    ? fixtureFitnessDataSources[resolveFitnessFixtureScenario(process.env)]
    : notionFitnessDataSource
