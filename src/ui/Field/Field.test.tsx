import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { describedBy, Field } from "./Field";

afterEach(cleanup);

const ids = { inputId: "in", helpId: "help", errorId: "err" };

describe("Field", () => {
  it("labels its control and renders help and error", () => {
    render(
      <Field ids={ids} label="Handle" help="Your judge handle" error="Required">
        <input id="in" />
      </Field>,
    );
    expect(screen.getByLabelText("Handle").id).toBe("in");
    expect(screen.getByText("Your judge handle").id).toBe("help");
    expect(screen.getByText("Required").id).toBe("err");
  });
});

describe("describedBy", () => {
  it("lists help then error, or nothing", () => {
    expect(describedBy(ids)).toBeUndefined();
    expect(describedBy(ids, "h")).toBe("help");
    expect(describedBy(ids, undefined, "e")).toBe("err");
    expect(describedBy(ids, "h", "e")).toBe("help err");
  });
});
