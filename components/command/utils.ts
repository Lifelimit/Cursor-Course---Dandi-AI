export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/** Shared focus state for account form fields — keeps the existing border as the only focus treatment. */
export const fieldFocusClasses =
  "focus:border-emerald-300/50 focus:!outline-none focus:ring-0";

/** Hides native number input stepper arrows while keeping numeric keyboard input. */
export const numberInputClasses =
  "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";
