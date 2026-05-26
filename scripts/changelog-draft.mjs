#!/usr/bin/env node
/**
 * Changelog draft generator.
 *
 * Reads the most recent `toCommit` from `src/lib/constants/changelog.ts`,
 * grabs every commit since then (excluding merges), groups them by conventional
 * prefix (feat/fix/refactor/...), and prints a markdown summary to stdout.
 *
 * Workflow:
 *   1. `npm run changelog:draft` > /tmp/draft.md   (or pipe straight to your LLM)
 *   2. Feed the output to an LLM with the prompt at the bottom of this file.
 *   3. Paste the resulting ChangelogEntry object at the TOP of CHANGELOG[].
 *
 * No runtime dependency — this is a developer-only script.
 */

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const CHANGELOG_PATH = resolve(here, '../src/lib/constants/changelog.ts');

// Crude regex extraction: avoids pulling a TS toolchain just to read one value.
// The file is hand-edited so the literal `toCommit: 'xxxx'` form is stable.
function findLatestToCommit() {
  const src = readFileSync(CHANGELOG_PATH, 'utf8');
  const match = src.match(/toCommit:\s*['"]([0-9a-f]{6,40})['"]/);
  return match?.[1];
}

function git(args) {
  return execSync(`git ${args}`, { encoding: 'utf8' }).trim();
}

const lastCommit = findLatestToCommit();
if (!lastCommit) {
  console.error('No `toCommit` found in changelog.ts — bootstrapping needs at least one entry with a toCommit field.');
  process.exit(1);
}

// Verify the commit exists locally (catches stale entries after history rewrites).
try {
  git(`cat-file -e ${lastCommit}`);
} catch {
  console.error(`Commit ${lastCommit} not found in this repo. Either fetch more history or update changelog.ts.`);
  process.exit(1);
}

const headSha = git('rev-parse --short HEAD');
const range = `${lastCommit}..HEAD`;

// One line per commit: "<short-sha>\t<subject>"
// --no-merges drops the noisy "Merge branch ..." commits from the sync workflow.
const log = git(
  `log ${range} --no-merges --date=short --pretty=format:%h%x09%s`,
);

if (!log) {
  console.log(`No new commits since ${lastCommit}. Nothing to draft.`);
  process.exit(0);
}

// Diffstat — gives the LLM signal about which files/areas changed so it can
// filter "internal refactor" from "user-visible feature".
const stat = git(`diff --stat ${range}`);

const lines = log.split('\n').map((line) => {
  const [sha, ...rest] = line.split('\t');
  return { sha, subject: rest.join('\t') };
});

const groups = {
  feat: [],
  fix: [],
  refactor: [],
  chore: [],
  docs: [],
  perf: [],
  other: [],
};

for (const { sha, subject } of lines) {
  const m = subject.match(/^(\w+)(?:\(.+?\))?:\s*(.+)$/);
  const type = m?.[1]?.toLowerCase();
  const body = m?.[2] ?? subject;
  if (type && type in groups) groups[type].push({ sha, body });
  else groups.other.push({ sha, body: subject });
}

const out = [];
out.push(`# Changelog draft (${lastCommit} → ${headSha})\n`);
out.push(`_${lines.length} commits, ${range}_\n`);

for (const [type, items] of Object.entries(groups)) {
  if (!items.length) continue;
  out.push(`\n## ${type}\n`);
  for (const { sha, body } of items) out.push(`- \`${sha}\` ${body}`);
}

out.push('\n\n## Diffstat\n');
out.push('```');
out.push(stat);
out.push('```');

out.push(`
---
## LLM prompt

Use the commits and diffstat above to draft **one** \`ChangelogEntry\` object for users.
Rules:
- Skip internal refactors, type cleanups, doc-only changes, and dependency bumps unless they're directly user-visible.
- Group related commits into a single highlight; don't list every commit.
- Aim for 1 short summary sentence + 2-4 highlight bullets.
- Provide both \`en\` and \`jp\` for every user-facing string.
- Use \`toCommit: '${headSha}'\` and the prior entry's \`toCommit\` (${lastCommit}) as \`fromCommit\`.
- Pick a date in YYYY-MM-DD format (today is fine).
- Choose an id like \`YYYY-MM-<slug>\`.

Output: the literal object only (no surrounding code fences, no commentary), ready to paste at the top of \`CHANGELOG\`.
`);

console.log(out.join('\n'));
