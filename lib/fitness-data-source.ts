import "server-only"

import {
  resolveFitnessDataSource,
  resolveFitnessFixtureScenario,
} from "@/lib/fitness-data-source-config"
import {
  emptyFixtureFitnessDataSource,
  fixtureFitnessDataSource,
} from "@/lib/fixture"
import { notionFitnessDataSource } from "@/lib/notion"

const fixtureFitnessDataSources = {
  empty: emptyFixtureFitnessDataSource,
  normal: fixtureFitnessDataSource,
}

const dataSourceName = resolveFitnessDataSource(process.env)

export const fitnessDataSource =
  dataSourceName === "fixture"
    ? fixtureFitnessDataSources[resolveFitnessFixtureScenario(process.env)]
    : notionFitnessDataSource
