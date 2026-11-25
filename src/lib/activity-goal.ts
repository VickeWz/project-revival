export const DEFAULT_STEP_GOAL = 10000;
export const LEGACY_GOAL_KEY = "activity_goal_steps";

export function validStepGoal(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1000 && value <= 50000;
}

/** Delete local data only after the account save has succeeded. The server handles concurrent imports. */
export async function importLegacyGoal(
  savedGoal: number | null,
  storage: Pick<Storage, "getItem" | "removeItem">,
  save: (goal: number) => Promise<number>,
): Promise<number> {
  const legacy = storage.getItem(LEGACY_GOAL_KEY);
  if (savedGoal !== null) {
    storage.removeItem(LEGACY_GOAL_KEY);
    return savedGoal;
  }
  const parsed = legacy === null ? DEFAULT_STEP_GOAL : Number(legacy);
  const result = await save(validStepGoal(parsed) ? parsed : DEFAULT_STEP_GOAL);
  storage.removeItem(LEGACY_GOAL_KEY);
  return result;
}