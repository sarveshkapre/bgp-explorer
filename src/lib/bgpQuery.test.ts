import { describe, expect, it } from "vitest";
import { parseBgpQuery } from "./bgpQuery";

describe("parseBgpQuery", () => {
  it("detects IP", () => {
    expect(parseBgpQuery("8.8.8.8")).toEqual({ kind: "ip", ip: "8.8.8.8" });
  });

  it("detects prefix", () => {
    expect(parseBgpQuery("8.8.8.0/24")).toEqual({ kind: "prefix", prefix: "8.8.8.0/24" });
  });

  it("detects ASN with AS prefix", () => {
    expect(parseBgpQuery("AS15169")).toEqual({ kind: "asn", asn: "15169" });
    expect(parseBgpQuery("as 15169")).toEqual({ kind: "asn", asn: "15169" });
  });

  it("returns unknown for org-like queries", () => {
    expect(parseBgpQuery("google")).toEqual({ kind: "unknown" });
  });
});

