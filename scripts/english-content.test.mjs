import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function filesIn(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? filesIn(file) : [file];
  });
}

test('project source, tests and documentation contain no Korean text', () => {
  const files = ['README.md', ...['src', 'scripts', 'docs'].flatMap(filesIn)]
    .filter((file) => /\.(?:tsx?|mjs|json|md|css|txt)$/.test(file));
  const matches = files.filter((file) => /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]/u.test(fs.readFileSync(file, 'utf8')));
  assert.deepEqual(matches, []);
});

test('the document declares English for screen readers and browsers', () => {
  const source = fs.readFileSync('src/app/layout.tsx', 'utf8');
  assert.match(source, /<html lang="en"/);
});
