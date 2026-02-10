import { describe, expect, it } from "vitest";
import {
  routeViewsLatestPeerTimestamp,
  routeViewsOriginAsn,
  routeViewsReportingPeersCount,
  routeViewsRPKIState,
} from "./routeViews";

describe("RouteViews helpers", () => {
  it("extracts latest peer timestamp", () => {
    const v = [
      {
        reporting_peers: [{ timestamp: "2026-02-10T01:00:00Z" }, { timestamp: "2026-02-10T12:00:00Z" }],
      },
    ];
    expect(routeViewsLatestPeerTimestamp(v)).toBe("2026-02-10T12:00:00Z");
  });

  it("extracts rpki_state and origin_asn", () => {
    const v = [{ rpki_state: "valid", origin_asn: 15169 }];
    expect(routeViewsRPKIState(v)).toBe("valid");
    expect(routeViewsOriginAsn(v)).toBe("15169");
  });

  it("counts reporting peers", () => {
    const v = [{ reporting_peers: [{}, {}, {}] }];
    expect(routeViewsReportingPeersCount(v)).toBe(3);
  });
});

