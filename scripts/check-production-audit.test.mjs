import { describe, expect, it } from "vitest";

import { evaluateAudit } from "./check-production-audit.mjs";

const today = "2026-08-09";

function report(vulnerabilities = {}) {
  return { vulnerabilities };
}

function vulnerability(severity, fixAvailable, url = "https://example.test/GHSA-test") {
  return {
    severity,
    fixAvailable,
    nodes: ["node_modules/example"],
    via: [{ url }],
  };
}

describe("production audit policy", () => {
  it("ผ่านเมื่อ production audit สะอาด", () => {
    expect(evaluateAudit(report(), { noFixHigh: {} }, today).ok).toBe(true);
  });

  it("บล็อก Critical และ High ที่มี fix", () => {
    const result = evaluateAudit(
      report({
        critical: vulnerability("critical", false),
        fixable: vulnerability("high", true),
      }),
      { noFixHigh: {} },
      today,
    );

    expect(result.ok).toBe(false);
    expect(result.critical).toHaveLength(1);
    expect(result.fixableHigh).toHaveLength(1);
  });

  it("บล็อก High ที่ไม่มี fixและยังไม่ถูกติดตาม", () => {
    const result = evaluateAudit(
      report({ pending: vulnerability("high", false) }),
      { noFixHigh: {} },
      today,
    );

    expect(result.ok).toBe(false);
    expect(result.untrackedNoFixHigh).toHaveLength(1);
  });

  it("รายงาน High ที่ไม่มี fixเมื่อมี owner, advisory และ review date", () => {
    const url = "https://example.test/GHSA-test";
    const result = evaluateAudit(
      report({ pending: vulnerability("high", false, url) }),
      {
        noFixHigh: {
          pending: {
            owner: "platform",
            reviewDate: "2026-09-09",
            advisories: [url],
          },
        },
      },
      today,
    );

    expect(result.ok).toBe(true);
    expect(result.trackedNoFixHigh).toHaveLength(1);
  });

  it("บล็อก tracking ที่เลย review date", () => {
    const url = "https://example.test/GHSA-test";
    const result = evaluateAudit(
      report({ pending: vulnerability("high", false, url) }),
      {
        noFixHigh: {
          pending: {
            owner: "platform",
            reviewDate: "2026-08-08",
            advisories: [url],
          },
        },
      },
      today,
    );

    expect(result.ok).toBe(false);
    expect(result.expiredNoFixHigh).toHaveLength(1);
  });
});
