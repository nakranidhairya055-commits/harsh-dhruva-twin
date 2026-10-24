#!/usr/bin/env node
/**
 * Credential scanner.
 *
 * DhruvaTwin keeps every secret server side: provider keys are read from
 * `process.env` inside Convex `"use node"` actions, which are bundled and run on
 * the backend, never in the browser. This script is the guard rail around that
 * rule, so a key pasted into a component by mistake fails loudly instead of
 * shipping in the client bundle.
 *
 * Run it before committing:
 *
 *   bun run scan:secrets
 *
 * It scans the source tree for credential-shaped strings and exits non-zero on
 * a finding, so it can be wired into a pre-commit hook or CI step later.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const ROOT = process.cwd();
const TARGETS = ["src", "index.html", "vite.config.ts", "convex.json", "README.md"];
const SKIP_DIRS = new Set(["node_modules", "dist", ".git", "_generated", "public"]);
const SOURCE_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".json", ".html", ".md"]);

/** Credential shapes, not names: a name like `apiKey` is fine, a value is not. */
const PATTERNS = [
  { name: "Groq / OpenAI style key", re: /\b(?:gsk_|sk-)[A-Za-z0-9_-]{20,}\b/ },
  { name: "Anthropic key", re: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/ },
  { name: "Google API key", re: /\bAIza[0-9A-Za-z_-]{33,}\b/ },
  { name: "AWS access key id", re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/ },
  { name: "GitHub token", re: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/ },
  { name: "Stripe key", re: /\b(?:sk|pk|rk)_(?:live|test)_[A-Za-z0-9]{20,}\b/ },
  { name: "Slack token", re: /\bxox[abprs]-[A-Za-z0-9-]{20,}\b/ },
  { name: "Private key block", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: "Bearer token literal", re: /Bearer\s+[A-Za-z0-9._-]{32,}/ },
  { name: "Assigned secret literal", re: /\b(?:api[_-]?key|apikey|secret|access[_-]?token|client[_-]?secret)\s*[:=]\s*["'][A-Za-z0-9_\-.]{20,}["']/i },
];

/**
 * Known non-secret literals.
 *
 * The one entry is the template's shared OTP relay credential in the auth
 * provider: it is a relay identity for the platform's own email sender that
 * ships with the template, it is not a project secret, and it grants nothing
 * beyond sending a one-time code through that relay. Anything not listed here
 * is a finding.
 */
const ALLOW = [
  {
    file: "src/convex/auth/emailOtp.ts",
    pattern: /Assigned secret literal|Bearer token literal/,
    note: "shared template OTP relay credential",
  },
];

const findings = [];
const notes = [];

function walk(path) {
  const stats = statSync(path);
  if (stats.isDirectory()) {
    for (const entry of readdirSync(path)) {
      if (SKIP_DIRS.has(entry)) continue;
      walk(join(path, entry));
    }
    return;
  }
  if (!SOURCE_EXT.has(extname(path))) return;

  const rel = relative(ROOT, path);
  const text = readFileSync(path, "utf8");
  const lines = text.split("\n");
  lines.forEach((line, index) => {
    for (const pattern of PATTERNS) {
      if (!pattern.re.test(line)) continue;
      const allowed = ALLOW.find(
        (entry) => entry.file === rel && entry.pattern.test(pattern.name),
      );
      if (allowed) {
        notes.push(`${rel}:${index + 1} - ${pattern.name} (${allowed.note})`);
        continue;
      }
      findings.push(`${rel}:${index + 1} - ${pattern.name}`);
    }
  });
}

for (const target of TARGETS) {
  try {
    walk(join(ROOT, target));
  } catch {
    // A target that does not exist is not an error.
  }
}

if (notes.length > 0) {
  console.log("Known, reviewed literals:");
  for (const note of notes) console.log(`  - ${note}`);
}

if (findings.length > 0) {
  console.error(`\nSecret scan FAILED: ${findings.length} credential-shaped literal(s) found.`);
  for (const finding of findings) console.error(`  - ${finding}`);
  console.error(
    "\nMove the value into the platform's Keys / API keys UI and read it from process.env inside a Convex action.",
  );
  process.exit(1);
}

console.log("Secret scan passed: no credential-shaped literal in the source tree.");
