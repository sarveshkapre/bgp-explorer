import { describe, expect, it } from "vitest";
import { normalizeIp } from "./ip";

describe("normalizeIp", () => {
  it("normalizes IPv4 with port", () => {
    expect(normalizeIp("1.2.3.4:1234")).toBe("1.2.3.4");
  });

  it("strips brackets around IPv6", () => {
    expect(normalizeIp("[2001:db8::1]")).toBe("2001:db8::1");
  });

  it("uses the first IP in x-forwarded-for style chains", () => {
    expect(normalizeIp("8.8.8.8, 1.1.1.1")).toBe("8.8.8.8");
  });

  it("rejects invalid input", () => {
    expect(normalizeIp("999.1.1.1")).toBeNull();
    expect(normalizeIp("not-an-ip")).toBeNull();
  });
});

