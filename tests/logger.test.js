import test from 'node:test';
import assert from 'node:assert';
import { logger } from '../logger.js';

// verify formatted output

test('logger prints formatted message', () => {
  let output = '';
  const original = console.log;
  console.log = (msg) => { output += msg; };

  logger('hello', { sentiment: 'positive', processLevel: 2 });
  assert.strictEqual(output.trim(), '└─✅ hello');

  console.log = original;
});
