import "server-only"

import type { BodyCompositionGoals } from "@/lib/fitness/body-composition-goal/body-composition-goal"

/** 最終目標（2027-03-31まで）。 */
export const BODY_COMPOSITION_GOALS: BodyCompositionGoals = {
  deadline: "2027-03-31",
  targets: {
    weight: { kind: "atMost", value: 68.5 },
    bodyFat: { kind: "atMost", value: 19.9 },
    bodyFatMass: { kind: "atMost", value: 13.5 },
    muscleMass: { kind: "atLeast", value: 31.3 },
  },
}
