import test from 'node:test';
import assert from 'node:assert/strict';

import { buildStampFilter } from '../src/stampEffects.js';

test('builds neutral stamp filter by default', () => {
  assert.equal(
    buildStampFilter({ blur: 0, brightness: 100, saturation: 100 }),
    'blur(0px) brightness(100%) saturate(100%)',
  );
});

test('builds custom stamp filter values', () => {
  assert.equal(
    buildStampFilter({ blur: 1.5, brightness: 86, saturation: 72 }),
    'blur(1.5px) brightness(86%) saturate(72%)',
  );
});
