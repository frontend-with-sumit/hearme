/**
 * Shared story checks (spec 0003). `preview.tsx` runs them after every story
 * in the Vitest browser run, so each primitive gets them for free:
 *  - hit area probe (AC-8): every control answers pointer input over 44 x 44px
 *  - reflow (AC-3): nothing scrolls sideways at a 320px viewport
 *  - reduced motion (AC-10): no animation is left running
 */

const HALF = 21.75;

const CONTROLS = [
  "button",
  "a[href]",
  "input:not([type=hidden])",
  "[role=radio]",
  "[role=checkbox]",
  "[role=switch]",
].join(",");

/** Controls that are exempt or not pointer targets by themselves. */
function isChecked(el: Element): boolean {
  // Links inside running sentences are exempt (WCAG 2.5.8 inline exception).
  if (el.matches("a[href]") && el.closest("p")) return false;
  // Radix renders a hidden native input beside its button; skip that bubble.
  if (el.matches("input") && el.getAttribute("aria-hidden") === "true")
    return false;
  // A disabled control is exempt.
  if (el.matches(":disabled")) return false;
  const style = getComputedStyle(el);
  if (style.visibility === "hidden" || style.display === "none") return false;
  return true;
}

function accepts(target: Element | null, control: Element): boolean {
  if (!target) return false;
  if (target === control || control.contains(target)) return true;
  const labels = (control as HTMLInputElement).labels;
  if (labels)
    return Array.from(labels).some(
      (label) => label === target || label.contains(target),
    );
  const wrapping = control.closest("label");
  return (
    wrapping !== null && (wrapping === target || wrapping.contains(target))
  );
}

/** Describes an element for a failure message. */
function describe(el: Element | null): string {
  if (!el) return "nothing";
  const r = el.getBoundingClientRect();
  const text = `${(el.textContent ?? "").trim().slice(0, 24)} @y${r.top.toFixed(1)}-${r.bottom.toFixed(1)}`;
  return `<${el.tagName.toLowerCase()}${el.getAttribute("data-slot") ? ` data-slot=${el.getAttribute("data-slot")}` : ""}>${text ? ` "${text}"` : ""}`;
}

/** Returns a description of every control that fails the 44px probe. */
export function findSmallHitAreas(root: Element): string[] {
  return Array.from(root.querySelectorAll(CONTROLS))
    .filter(isChecked)
    .flatMap((control) => {
      const rect = control.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return [];
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const points: Array<[string, number, number]> = [
        ["left", cx - HALF, cy],
        ["right", cx + HALF, cy],
        ["above", cx, cy - HALF],
        ["below", cx, cy + HALF],
      ];
      return points.flatMap(([side, x, y]) => {
        // Points off screen cannot be probed (a skip link waiting for focus).
        if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return [];
        const hit = document.elementFromPoint(x, y);
        return accepts(hit, control)
          ? []
          : [
              `${describe(control)} ${Math.round(rect.width)}x${Math.round(rect.height)}, ${side} point hits ${describe(hit)}`,
            ];
      });
    });
}

/** True when the page does not scroll sideways. */
export function fitsViewport(): boolean {
  const html = document.documentElement;
  return html.scrollWidth <= html.clientWidth;
}

/** Number of animations still running or pending on the document. */
export function runningAnimations(): number {
  return document.getAnimations().length;
}
