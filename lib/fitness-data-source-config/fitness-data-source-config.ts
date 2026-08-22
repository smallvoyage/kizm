export type FitnessDataSourceName = "fixture" | "notion"
export type FitnessFixtureScenario = "empty" | "missing-nutrition" | "normal"

type FitnessDataSourceEnvironment = {
  FITNESS_ALLOW_FIXTURE_IN_PRODUCTION?: string
  FITNESS_DATA_SOURCE?: string
  FITNESS_FIXTURE_SCENARIO?: string
  NODE_ENV?: string
}

export function resolveFitnessDataSource(
  environment: FitnessDataSourceEnvironment
): FitnessDataSourceName {
  const dataSource = environment.FITNESS_DATA_SOURCE?.trim() || "notion"

  if (dataSource !== "fixture" && dataSource !== "notion") {
    throw new Error(
      `FITNESS_DATA_SOURCE must be "notion" or "fixture" (received: ${JSON.stringify(dataSource)})`
    )
  }

  if (
    dataSource === "fixture" &&
    environment.NODE_ENV === "production" &&
    environment.FITNESS_ALLOW_FIXTURE_IN_PRODUCTION !== "true"
  ) {
    throw new Error(
      "Fixture data is disabled in production. Set FITNESS_ALLOW_FIXTURE_IN_PRODUCTION=true only for an intentional test deployment."
    )
  }

  return dataSource
}

export function resolveFitnessFixtureScenario(
  environment: FitnessDataSourceEnvironment
): FitnessFixtureScenario {
  const scenario = environment.FITNESS_FIXTURE_SCENARIO?.trim() || "normal"

  if (
    scenario !== "empty" &&
    scenario !== "missing-nutrition" &&
    scenario !== "normal"
  ) {
    throw new Error(
      `FITNESS_FIXTURE_SCENARIO must be "normal", "empty", or "missing-nutrition" (received: ${JSON.stringify(scenario)})`
    )
  }

  return scenario
}
