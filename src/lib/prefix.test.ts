import { describe, expect, it } from "vitest";
import { normalizePrefix } from "./prefix";

describe("normalizePrefix", () => {
  it("accepts valid IPv4 CIDR", () => {
    expect(normalizePrefix("8.8.8.0/24")).toBe("8.8.8.0/24");
  });

  it("rejects invalid masks", () => {
    expect(normalizePrefix("8.8.8.0/33")).toBeNull();
    expect(normalizePrefix("2001:db8::/129")).toBeNull();
  });

  it("accepts valid IPv6 CIDR", () => {
    expect(normalizePrefix("2001:db8::/32")).toBe("2001:db8::/32");
  });
});

