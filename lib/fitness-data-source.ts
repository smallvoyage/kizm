import "server-only"

import { resolveFitnessDataSource } from "@/lib/fitness-data-source-config"
import { fixtureFitnessDataSource } from "@/lib/fixture"
import { notionFitnessDataSource } from "@/lib/notion"

const fitnessDataSources = {
  fixture: fixtureFitnessDataSource,
  notion: notionFitnessDataSource,
}

export const fitnessDataSource =
  fitnessDataSources[resolveFitnessDataSource(process.env)]
