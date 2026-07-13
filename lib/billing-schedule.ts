export function isActiveScheduledPlanChange(
  scheduledPlan: string | null | undefined,
  scheduledPlanDate: string | null | undefined,
  currentPlan: string,
  now: Date = new Date(),
) {
  if (!scheduledPlan || scheduledPlan.toLowerCase() === currentPlan.toLowerCase()) {
    return false;
  }
  if (!scheduledPlanDate) return true;

  const effectiveAt = new Date(scheduledPlanDate);
  return !Number.isNaN(effectiveAt.getTime()) && effectiveAt > now;
}
