const normalizeNumber = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

export function buildStampFilter({ blur = 0, brightness = 100, saturation = 100 }) {
  const normalizedBlur = normalizeNumber(blur, 0);
  const normalizedBrightness = normalizeNumber(brightness, 100);
  const normalizedSaturation = normalizeNumber(saturation, 100);

  return `blur(${normalizedBlur}px) brightness(${normalizedBrightness}%) saturate(${normalizedSaturation}%)`;
}
