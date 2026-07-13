export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/** Shared focus ring for account form fields — avoids double border + thick ring stacking. */
export const fieldFocusClasses =
  "focus-visible:border-emerald-300/50 focus-visible:ring-2 focus-visible:ring-emerald-300/20";

/** Hides native number input stepper arrows while keeping numeric keyboard input. */
export const numberInputClasses =
  "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";
