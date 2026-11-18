import { describe, expect, it } from "vitest";
import {
  addAttempt,
  dropPending,
  markSent,
  restorePending,
  type Attempt,
} from "./trial-attempts";

type Owner = { candidateId: string; name: string; attempts: Attempt[] };

const owners = (): Owner[] => [
  { candidateId: "c1", name: "A", attempts: [] },
  {
    candidateId: "c2",
    name: "B",
    attempts: [{ id: "m1", attempt: 1, value: 4 }],
  },
];

describe("addAttempt", () => {
  it("adds an attempt to the right child only", () => {
    const result = addAttempt(owners(), "c1", {
      id: "x",
      attempt: 1,
      value: 3,
    });
    expect(result[0].attempts).toHaveLength(1);
    expect(result[1].attempts).toHaveLength(1);
  });

  it("does not add an attempt number that is already there", () => {
    const result = addAttempt(owners(), "c2", {
      id: "y",
      attempt: 1,
      value: 9,
    });
    expect(result[1].attempts).toEqual([{ id: "m1", attempt: 1, value: 4 }]);
  });

  it("does not change the input", () => {
    const input = owners();
    addAttempt(input, "c1", { id: "x", attempt: 1, value: 3 });
    expect(input[0].attempts).toEqual([]);
  });
});

describe("markSent", () => {
  const pending = () =>
    addAttempt(owners(), "c1", {
      id: "pending-e1",
      attempt: 1,
      value: 4.12,
      pending: true,
      eventId: "e1",
    });

  it("gives a sent attempt its real id and clears the pending marks", () => {
    const result = markSent(pending(), [
      { eventId: "e1", measurementId: "m99" },
    ]);
    expect(result[0].attempts).toEqual([
      { id: "m99", attempt: 1, value: 4.12 },
    ]);
  });

  it("leaves other attempts alone", () => {
    const result = markSent(pending(), [
      { eventId: "other", measurementId: "m5" },
    ]);
    expect(result[0].attempts[0]).toMatchObject({
      pending: true,
      eventId: "e1",
    });
    expect(result[1].attempts[0]).toEqual({ id: "m1", attempt: 1, value: 4 });
  });
});

describe("dropPending", () => {
  it("removes the attempts the server refused", () => {
    const withPending = addAttempt(owners(), "c1", {
      id: "pending-e1",
      attempt: 1,
      value: 4,
      pending: true,
      eventId: "e1",
    });
    const result = dropPending(withPending, ["e1"]);
    expect(result[0].attempts).toEqual([]);
    expect(result[1].attempts).toHaveLength(1);
  });

  it("returns the same data when nothing is dropped", () => {
    expect(dropPending(owners(), [])).toEqual(owners());
  });
});

describe("restorePending", () => {
  const owner = (candidateId: string, attempts: Attempt[] = []) => ({
    candidateId,
    attempts,
  });
  const queued = (
    id: string,
    trialType: string,
    candidateId: string,
    attempt: number,
    value: number,
  ) => ({ id, payload: { trialType, candidateId, attempt, value } });

  it("shows results waiting on the phone again after a reload", () => {
    const result = restorePending(
      [owner("c1"), owner("c2")],
      [queued("e1", "sprint_30m", "c1", 1, 5.6)],
      "sprint_30m",
    );
    expect(result[0].attempts).toEqual([
      {
        id: "pending-e1",
        attempt: 1,
        value: 5.6,
        pending: true,
        eventId: "e1",
      },
    ]);
    expect(result[1].attempts).toEqual([]);
  });

  it("ignores other tests and attempt numbers the server already has", () => {
    const saved: Attempt = { id: "m1", attempt: 1, value: 5.5 };
    const result = restorePending(
      [owner("c1", [saved])],
      [
        queued("e1", "sprint_30m", "c1", 1, 5.6),
        queued("e2", "passing", "c1", 2, 7),
      ],
      "sprint_30m",
    );
    expect(result[0].attempts).toEqual([saved]);
  });

  it("skips children that are not in this list", () => {
    const result = restorePending(
      [owner("c1")],
      [queued("e1", "sprint_30m", "ghost", 1, 5)],
      "sprint_30m",
    );
    expect(result[0].attempts).toEqual([]);
  });
});
