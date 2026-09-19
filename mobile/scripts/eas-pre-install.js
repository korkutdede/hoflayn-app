const fs = require("fs");
const path = require("path");

const mobileRoot = path.resolve(__dirname, "..");
const monorepoRoot = path.resolve(mobileRoot, "..");
const required = [
  "packages/calc/package.json",
  "packages/contracts/package.json",
  "packages/i18n/package.json",
  "package.json",
  "package-lock.json",
];

const missing = required.filter(
  (rel) => !fs.existsSync(path.join(monorepoRoot, rel)),
);

console.log("[eas-pre-install] mobileRoot=", mobileRoot);
console.log("[eas-pre-install] monorepoRoot=", monorepoRoot);
console.log(
  "[eas-pre-install] root entries=",
  fs.readdirSync(monorepoRoot).slice(0, 40).join(", "),
);

if (missing.length > 0) {
  console.error(
    "[eas-pre-install] Missing monorepo files required for @hoflayn packages:",
    missing.join(", "),
  );
  process.exit(1);
}

console.log("[eas-pre-install] Monorepo packages present.");
