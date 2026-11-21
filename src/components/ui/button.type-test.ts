/**
 * Type level tests for Button's `size="icon"` rules (spec 0003, AC-9).
 * `pnpm typecheck` proves them: each `@ts-expect-error` line must be an error
 * and each plain line must not be. Not a runtime test. `asChild` bypasses
 * these rules on purpose, since the child element supplies its own content.
 */
import { createElement } from "react";

import { Button } from "./button";

const glyph = createElement("svg");

// Allowed: an icon button with a label and an icon.
createElement(Button, { size: "icon", "aria-label": "Close", icon: glyph });

// Allowed: text sizes take children and need no label.
createElement(Button, { size: "lg" }, "Book a session");

// @ts-expect-error an icon button must have an aria-label
createElement(Button, { size: "icon", icon: glyph });

// @ts-expect-error an icon button forbids children
// eslint-disable-next-line react/no-children-prop
createElement(Button, { size: "icon", "aria-label": "Close", children: "x" });
