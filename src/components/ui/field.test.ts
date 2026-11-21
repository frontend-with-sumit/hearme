import {
  createElement,
  type ComponentType,
  type ReactElement,
  type ReactNode,
} from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Field } from "./field";
import { Input } from "./input";
import { Textarea } from "./textarea";

/** Field types its child as one element; createElement passes children as extra arguments. */
const FieldWithChild = Field as unknown as ComponentType<{
  label: string;
  helper?: string;
  error?: string;
  children?: ReactNode;
}>;

const render = (
  props: { label: string; helper?: string; error?: string },
  child: ReactElement,
) => renderToStaticMarkup(createElement(FieldWithChild, props, child));

describe("Field around Input and Textarea (spec 0003, AC-9)", () => {
  it("keeps the control's own invalid state when Field has no error", () => {
    const out = render(
      { label: "Name" },
      createElement(Input, { invalid: true }),
    );
    expect(out).toContain('aria-invalid="true"');
  });

  it("does the same for Textarea", () => {
    const out = render(
      { label: "Note" },
      createElement(Textarea, { invalid: true }),
    );
    expect(out).toContain('aria-invalid="true"');
  });

  it("marks the control invalid and links the error when Field has an error", () => {
    const out = render(
      { label: "Name", error: "Required" },
      createElement(Input),
    );
    expect(out).toContain('aria-invalid="true"');
    expect(out).toMatch(/aria-describedby="[^"]*-error"/);
  });

  it("keeps a describedby the control already had", () => {
    const out = render(
      { label: "Name", helper: "Help" },
      createElement(Input, { "aria-describedby": "extra" }),
    );
    expect(out).toMatch(/aria-describedby="[^"]*-helper extra"/);
  });

  it("adds no aria attributes when there is nothing to say", () => {
    const out = render({ label: "Name" }, createElement(Input));
    expect(out).not.toContain(" aria-invalid=");
    expect(out).not.toContain(" aria-describedby=");
  });
});
