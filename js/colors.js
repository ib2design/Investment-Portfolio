// Hand-picked pastels — each entry is visually distinct from the others.
const COMPANY_PALETTE = [
  {
    accent: 'hsl(350 62% 52%)',
    accentDark: 'hsl(350 78% 68%)',
    bg: 'hsl(350 75% 94%)',
    border: 'hsl(350 55% 86%)',
    bgDark: 'hsl(350 48% 24%)',
    borderDark: 'hsl(350 55% 40%)',
  },
  {
    accent: 'hsl(24 78% 48%)',
    accentDark: 'hsl(24 90% 66%)',
    bg: 'hsl(24 85% 91%)',
    border: 'hsl(24 65% 82%)',
    bgDark: 'hsl(24 52% 23%)',
    borderDark: 'hsl(24 60% 38%)',
  },
  {
    accent: 'hsl(98 48% 42%)',
    accentDark: 'hsl(98 62% 62%)',
    bg: 'hsl(98 55% 91%)',
    border: 'hsl(98 40% 80%)',
    bgDark: 'hsl(98 42% 22%)',
    borderDark: 'hsl(98 48% 36%)',
  },
  {
    accent: 'hsl(152 48% 38%)',
    accentDark: 'hsl(152 58% 58%)',
    bg: 'hsl(152 45% 92%)',
    border: 'hsl(152 38% 82%)',
    bgDark: 'hsl(152 40% 21%)',
    borderDark: 'hsl(152 46% 35%)',
  },
  {
    accent: 'hsl(188 55% 40%)',
    accentDark: 'hsl(188 68% 58%)',
    bg: 'hsl(188 60% 91%)',
    border: 'hsl(188 45% 81%)',
    bgDark: 'hsl(188 44% 22%)',
    borderDark: 'hsl(188 52% 36%)',
  },
  {
    accent: 'hsl(218 62% 50%)',
    accentDark: 'hsl(218 78% 68%)',
    bg: 'hsl(218 70% 93%)',
    border: 'hsl(218 55% 84%)',
    bgDark: 'hsl(218 48% 23%)',
    borderDark: 'hsl(218 55% 38%)',
  },
  {
    accent: 'hsl(262 52% 54%)',
    accentDark: 'hsl(262 72% 72%)',
    bg: 'hsl(262 55% 94%)',
    border: 'hsl(262 42% 85%)',
    bgDark: 'hsl(262 42% 24%)',
    borderDark: 'hsl(262 50% 40%)',
  },
  {
    accent: 'hsl(305 50% 50%)',
    accentDark: 'hsl(305 68% 68%)',
    bg: 'hsl(305 55% 93%)',
    border: 'hsl(305 42% 84%)',
    bgDark: 'hsl(305 42% 23%)',
    borderDark: 'hsl(305 50% 38%)',
  },
  {
    accent: 'hsl(42 72% 46%)',
    accentDark: 'hsl(42 88% 62%)',
    bg: 'hsl(42 80% 90%)',
    border: 'hsl(42 60% 80%)',
    bgDark: 'hsl(42 48% 22%)',
    borderDark: 'hsl(42 58% 36%)',
  },
  {
    accent: 'hsl(175 50% 38%)',
    accentDark: 'hsl(175 62% 56%)',
    bg: 'hsl(175 48% 91%)',
    border: 'hsl(175 40% 81%)',
    bgDark: 'hsl(175 40% 21%)',
    borderDark: 'hsl(175 48% 35%)',
  },
];

export const PALETTE_SIZE = COMPANY_PALETTE.length;

export function getSpreadColorIndices(companyCount) {
  if (companyCount <= 0) {
    return [];
  }

  if (companyCount === 1) {
    return [0];
  }

  const indices = [];
  for (let index = 0; index < companyCount; index += 1) {
    indices.push(Math.round((index * (PALETTE_SIZE - 1)) / (companyCount - 1)));
  }

  return indices;
}

function getPaletteEntry(colorIndex) {
  const safeIndex = ((colorIndex % PALETTE_SIZE) + PALETTE_SIZE) % PALETTE_SIZE;
  return COMPANY_PALETTE[safeIndex];
}

export function getCompanyColorVars(colorIndex) {
  const entry = getPaletteEntry(colorIndex);

  return {
    '--company-accent': entry.accent,
    '--company-accent-dark': entry.accentDark,
    '--company-bg': entry.bg,
    '--company-border': entry.border,
    '--company-bg-dark': entry.bgDark,
    '--company-border-dark': entry.borderDark,
  };
}

export function companyColorStyle(colorIndex) {
  const vars = getCompanyColorVars(colorIndex);

  return Object.entries(vars)
    .map(([name, value]) => `${name}: ${value}`)
    .join('; ');
}
