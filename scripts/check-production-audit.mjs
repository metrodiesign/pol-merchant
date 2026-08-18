import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const policyPath = new URL("./production-audit-policy.json", import.meta.url);

function advisoryUrls(vulnerability) {
  return vulnerability.via
    .filter((item) => typeof item === "object" && item?.url)
    .map((item) => item.url)
    .sort();
}

export function evaluateAudit(report, policy, today) {
  const result = {
    critical: [],
    fixableHigh: [],
    trackedNoFixHigh: [],
    untrackedNoFixHigh: [],
    expiredNoFixHigh: [],
  };

  for (const [name, vulnerability] of Object.entries(
    report.vulnerabilities ?? {},
  )) {
    if (vulnerability.severity === "critical") {
      result.critical.push({ name, vulnerability });
      continue;
    }
    if (vulnerability.severity !== "high") continue;
    if (vulnerability.fixAvailable) {
      result.fixableHigh.push({ name, vulnerability });
      continue;
    }

    const tracking = policy.noFixHigh?.[name];
    const advisories = advisoryUrls(vulnerability);
    const trackedAdvisories = new Set(tracking?.advisories ?? []);
    const complete =
      tracking?.owner &&
      /^\d{4}-\d{2}-\d{2}$/.test(tracking.reviewDate ?? "") &&
      advisories.every((url) => trackedAdvisories.has(url));
    const item = { name, vulnerability, tracking, advisories };

    if (!complete) result.untrackedNoFixHigh.push(item);
    else if (tracking.reviewDate < today) result.expiredNoFixHigh.push(item);
    else result.trackedNoFixHigh.push(item);
  }

  return {
    ...result,
    ok:
      result.critical.length === 0 &&
      result.fixableHigh.length === 0 &&
      result.untrackedNoFixHigh.length === 0 &&
      result.expiredNoFixHigh.length === 0,
  };
}

function printItems(label, items) {
  for (const item of items) {
    const nodes = item.vulnerability.nodes?.join(",") || "unknown";
    console.error(`${label}: ${item.name}; path=${nodes}`);
  }
}

export function main() {
  const audit = spawnSync("npm", ["audit", "--omit=dev", "--json"], {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  if (audit.error) throw audit.error;

  let report;
  try {
    report = JSON.parse(audit.stdout);
  } catch {
    console.error(audit.stderr || "npm audit did not return JSON");
    process.exitCode = 1;
    return;
  }
  if (report.error) {
    console.error(report.error.summary || JSON.stringify(report.error));
    process.exitCode = 1;
    return;
  }

  const policy = JSON.parse(readFileSync(policyPath, "utf8"));
  const today = new Date().toISOString().slice(0, 10);
  const result = evaluateAudit(report, policy, today);
  const counts = report.metadata?.vulnerabilities ?? {};

  console.log(
    `Production audit: critical=${counts.critical ?? 0}, high=${counts.high ?? 0}, total=${counts.total ?? 0}`,
  );
  for (const item of result.trackedNoFixHigh) {
    console.warn(
      `TRACKED no-fix High: ${item.name}; owner=${item.tracking.owner}; reviewDate=${item.tracking.reviewDate}; advisories=${item.advisories.join(",") || "dependency-chain"}`,
    );
  }
  printItems("BLOCK Critical", result.critical);
  printItems("BLOCK fixable High", result.fixableHigh);
  printItems("BLOCK untracked no-fix High", result.untrackedNoFixHigh);
  printItems("BLOCK expired no-fix High", result.expiredNoFixHigh);
  if (!result.ok) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
