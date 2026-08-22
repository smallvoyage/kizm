import "server-only"

import {
  resolveFitnessDataSource,
  resolveFitnessFixtureScenario,
} from "@/lib/fitness-data-source-config"
import {
  emptyFixtureFitnessDataSource,
  fixtureFitnessDataSource,
  workoutsErrorFixtureFitnessDataSource,
} from "@/lib/fixture"
import { notionFitnessDataSource } from "@/lib/notion"

const fixtureFitnessDataSources = {
  empty: emptyFixtureFitnessDataSource,
  normal: fixtureFitnessDataSource,
  "workouts-error": workoutsErrorFixtureFitnessDataSource,
}

const dataSourceName = resolveFitnessDataSource(process.env)

export const fitnessDataSource =
  dataSourceName === "fixture"
    ? fixtureFitnessDataSources[resolveFitnessFixtureScenario(process.env)]
    : notionFitnessDataSource
