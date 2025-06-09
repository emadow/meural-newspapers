import test from 'node:test';
import assert from 'node:assert';
import { logger } from '../logger.js';

// collect output
let output = '';
const originalLog = console.log;
console.log = (msg) => { output += msg; };

test('logger prints formatted message', () => {
  logger('hello', { sentiment: 'positive', processLevel: 2 });
  assert.strictEqual(output.trim(), ' └─✅ hello');
});

console.log = originalLog;
