import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import Module from 'node:module';

async function loadHelpers() {
  const original = Module._load;
  Module._load = function (request, parent, isMain) {
    if (request === 'axios') return () => Promise.resolve({});
    if (request === 'imagemagick') return { identify: (_, cb) => cb(null, {}), convert: (_, cb) => cb(null) };
    if (request === 'p-limit') return () => fn => Promise.resolve().then(fn);
    if (request.endsWith('config.json')) return {};
    return original(request, parent, isMain);
  };
  const mod = await import('../newspapers.js');
  Module._load = original;
  return mod;
}

test('directory helpers work correctly', async () => {
  const tmp = fs.mkdtempSync(path.join(process.cwd(), 'tmp-'));
  fs.writeFileSync(path.join(tmp, 'a.pdf'), '');
  fs.writeFileSync(path.join(tmp, '.hidden'), '');
  fs.mkdirSync(path.join(tmp, 'jpgs'));

  const helpers = await loadHelpers();
  const files = await helpers.getDirectoryContents(tmp);
  assert.deepStrictEqual(files, ['a.pdf']);

  await helpers.clearDirectory(tmp);
  const remaining = fs.readdirSync(tmp);
  assert.deepStrictEqual(remaining.sort(), ['.hidden', 'jpgs']);

  fs.rmSync(tmp, { recursive: true, force: true });
});
