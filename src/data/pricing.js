import { shadeColorOptions, solxPartOrder, solxParts } from './solxParts.js';

export const solxPricing = {
  currency: 'USD',
  lastChecked: '2026-04-29',
  sourceUrl: 'https://www.solsevenstudios.com/category/all-products',
  note: 'Estimated price is based on the modules in your current build. Final availability and pricing may change.',
  parts: {
    base: {
      label: 'Base',
      unitPrice: 35,
      sourceNote: 'Temporary module estimate from current public S01 sale price ($70) minus current S01 shade price ($35).',
      temporary: true,
    },
    s02: {
      label: 'S02 Shade',
      unitPrice: 35,
      sourceNote: 'Current public S02 Shade listing.',
    },
    s03: {
      label: 'S03 Shade',
      unitPrice: 35,
      sourceNote: 'Current public S03 Shade listing.',
    },
    s04: {
      label: 'S04 Shade',
      unitPrice: 40,
      sourceNote: 'Current public S04 Shade listing.',
    },
    divider: {
      label: 'Divider',
      unitPrice: 15,
      sourceNote: 'Temporary connector estimate. Update when a standalone divider listing is published.',
      temporary: true,
    },
  },
};

export function formatPricingValue(value, currency = solxPricing.currency) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function estimateSolXBuild(parts) {
  const counts = new Map();
  const colorCounts = new Map();

  parts.forEach((part) => {
    const partConfig = solxParts[part.partKey];
    if (!partConfig) return;

    counts.set(part.partKey, (counts.get(part.partKey) ?? 0) + 1);
    if (!colorCounts.has(part.partKey)) colorCounts.set(part.partKey, new Map());
    const colorsForPart = colorCounts.get(part.partKey);
    colorsForPart.set(part.color, (colorsForPart.get(part.color) ?? 0) + 1);
  });

  const lineItems = solxPartOrder
    .map((partKey) => {
      const quantity = counts.get(partKey) ?? 0;
      const price = solxPricing.parts[partKey];
      if (!quantity || !price) return null;

      const colors = Array.from(colorCounts.get(partKey)?.entries() ?? []).map(([colorKey, count]) => ({
        colorKey,
        count,
        label: shadeColorOptions[colorKey]?.label ?? colorKey,
      }));

      return {
        partKey,
        label: price.label,
        quantity,
        unitPrice: price.unitPrice,
        subtotal: price.unitPrice * quantity,
        sourceNote: price.sourceNote,
        temporary: Boolean(price.temporary),
        colors,
      };
    })
    .filter(Boolean);

  return {
    currency: solxPricing.currency,
    lineItems,
    total: lineItems.reduce((sum, item) => sum + item.subtotal, 0),
    note: solxPricing.note,
    hasTemporaryPricing: lineItems.some((item) => item.temporary),
  };
}
