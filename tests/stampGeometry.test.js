import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getEdgeStampPlacement,
  getEdgeStampSlices,
  pdfRectToScreenRect,
  screenRectToPdfRect,
} from '../src/stampGeometry.js';

test('converts screen rectangle to PDF coordinates with inverted Y axis', () => {
  const rect = screenRectToPdfRect({
    screenRect: { x: 100, y: 200, width: 80, height: 40 },
    viewport: { width: 400, height: 600 },
    page: { width: 200, height: 300 },
  });

  assert.deepEqual(rect, { x: 50, y: 180, width: 40, height: 20 });
});

test('converts PDF rectangle back to screen coordinates', () => {
  const rect = pdfRectToScreenRect({
    pdfRect: { x: 50, y: 180, width: 40, height: 20 },
    viewport: { width: 400, height: 600 },
    page: { width: 200, height: 300 },
  });

  assert.deepEqual(rect, { x: 100, y: 200, width: 80, height: 40 });
});

test('splits page-edge stamp into equal vertical image slices', () => {
  const slices = getEdgeStampSlices({
    imageWidth: 900,
    imageHeight: 300,
    pageCount: 3,
  });

  assert.deepEqual(slices, [
    { pageOffset: 0, x: 0, y: 0, width: 300, height: 300 },
    { pageOffset: 1, x: 300, y: 0, width: 300, height: 300 },
    { pageOffset: 2, x: 600, y: 0, width: 300, height: 300 },
  ]);
});

test('uses the remaining pixels for the last page-edge slice', () => {
  const slices = getEdgeStampSlices({
    imageWidth: 1000,
    imageHeight: 300,
    pageCount: 3,
  });

  assert.deepEqual(slices.at(-1), {
    pageOffset: 2,
    x: 666.67,
    y: 0,
    width: 333.33,
    height: 300,
  });
});

test('places right edge slice without stretching the full seal ratio', () => {
  const placement = getEdgeStampPlacement({
    page: { width: 600, height: 800 },
    settings: {
      top: 100,
      height: 120,
      pushIn: 72,
      edge: 'right',
    },
    image: { width: 900, height: 300 },
    pageCount: 3,
    pageOffset: 0,
  });

  assert.deepEqual(placement, {
    x: 528,
    y: 580,
    width: 120,
    height: 120,
    sourceX: 0,
    sourceWidth: 300,
  });
});
