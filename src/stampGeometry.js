const round2 = (value) => Math.round(value * 100) / 100;

export function screenRectToPdfRect({ screenRect, viewport, page }) {
  const scaleX = page.width / viewport.width;
  const scaleY = page.height / viewport.height;

  return {
    x: round2(screenRect.x * scaleX),
    y: round2(page.height - (screenRect.y + screenRect.height) * scaleY),
    width: round2(screenRect.width * scaleX),
    height: round2(screenRect.height * scaleY),
  };
}

export function pdfRectToScreenRect({ pdfRect, viewport, page }) {
  const scaleX = viewport.width / page.width;
  const scaleY = viewport.height / page.height;

  return {
    x: round2(pdfRect.x * scaleX),
    y: round2(viewport.height - (pdfRect.y + pdfRect.height) * scaleY),
    width: round2(pdfRect.width * scaleX),
    height: round2(pdfRect.height * scaleY),
  };
}

export function getEdgeStampSlices({ imageWidth, imageHeight, pageCount }) {
  if (!Number.isFinite(imageWidth) || imageWidth <= 0) {
    throw new Error('imageWidth must be greater than 0');
  }

  if (!Number.isFinite(imageHeight) || imageHeight <= 0) {
    throw new Error('imageHeight must be greater than 0');
  }

  if (!Number.isInteger(pageCount) || pageCount <= 0) {
    throw new Error('pageCount must be a positive integer');
  }

  const sliceWidth = imageWidth / pageCount;

  return Array.from({ length: pageCount }, (_, pageOffset) => {
    const x = sliceWidth * pageOffset;
    const nextX = pageOffset === pageCount - 1 ? imageWidth : sliceWidth * (pageOffset + 1);

    return {
      pageOffset,
      x: round2(x),
      y: 0,
      width: round2(nextX - x),
      height: round2(imageHeight),
    };
  });
}

export function getEdgeStampPlacement({ page, settings, image, pageCount, pageOffset }) {
  const fullWidth = settings.height * (image.width / image.height);
  const firstSliceWidth = clamp(settings.pushIn, 0, fullWidth);
  const restSliceWidth = pageCount > 1 ? (fullWidth - firstSliceWidth) / (pageCount - 1) : firstSliceWidth;
  const sliceWidth = pageOffset === 0 ? firstSliceWidth : restSliceWidth;
  const sourceScale = image.width / fullWidth;
  const sourceX = pageOffset === 0
    ? 0
    : firstSliceWidth * sourceScale + restSliceWidth * sourceScale * (pageOffset - 1);
  const x = settings.edge === 'left' ? 0 : page.width - sliceWidth;

  return {
    x: round2(x),
    y: round2(page.height - settings.top - settings.height),
    width: round2(sliceWidth),
    height: round2(settings.height),
    sourceX: round2(sourceX),
    sourceWidth: round2(sliceWidth * sourceScale),
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
