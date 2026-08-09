import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { resolve } from "node:path";

for (const cache of [".next", "tsconfig.tsbuildinfo"]) {
  rmSync(resolve(cache), { force: true, recursive: true });
}

const nextCli = resolve("node_modules", "next", "dist", "bin", "next");
const result = spawnSync(process.execPath, [nextCli, "dev", "-p", "5300"], {
  stdio: "inherit",
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
