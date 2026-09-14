/**
 * The circular Weave mark: a spectrum ring around a light centre, drawn in the header of every
 * Weave surface. A token-built stand-in until the real mark asset is exported from Figma.
 */
export function WeaveMark() {
  return (
    <span
      aria-hidden="true"
      className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-gradient"
    >
      <span className="size-3 rounded-full bg-surface" />
    </span>
  );
}
