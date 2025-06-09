import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { getDirectoryContents, clearDirectory } from '../newspapers.js';

const tmp = fs.mkdtempSync(path.join(process.cwd(), 'tmp-'));
fs.writeFileSync(path.join(tmp, 'a.pdf'), '');
fs.writeFileSync(path.join(tmp, '.hidden'), '');
fs.mkdirSync(path.join(tmp, 'jpgs'));

test('getDirectoryContents filters correctly', async () => {
  const files = await getDirectoryContents(tmp);
  assert.deepStrictEqual(files, ['a.pdf']);
});

test('clearDirectory removes files but keeps jpgs', async () => {
  await clearDirectory(tmp);
  const remaining = fs.readdirSync(tmp);
  assert.deepStrictEqual(remaining, ['jpgs']);
});

fs.rmSync(tmp, { recursive: true, force: true });
