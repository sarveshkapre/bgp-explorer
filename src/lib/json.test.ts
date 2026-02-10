import { describe, expect, it } from "vitest";
import { asRecord, getPath } from "./json";

describe("json helpers", () => {
  it("asRecord returns null for non-objects", () => {
    expect(asRecord(null)).toBeNull();
    expect(asRecord(undefined)).toBeNull();
    expect(asRecord(123)).toBeNull();
    expect(asRecord("x")).toBeNull();
  });

  it("getPath traverses nested records", () => {
    const v = { a: { b: { c: 1 } } };
    expect(getPath(v, ["a", "b", "c"])).toBe(1);
  });

  it("getPath returns undefined on missing/invalid intermediate", () => {
    expect(getPath({ a: 1 }, ["a", "b"])).toBeUndefined();
    expect(getPath(null, ["a"])).toBeUndefined();
  });
});

