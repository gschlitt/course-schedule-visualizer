const PALETTE = [
  '#4A90D9', '#E06C75', '#98C379', '#E5C07B', '#C678DD',
  '#56B6C2', '#D19A66', '#61AFEF', '#BE5046', '#7EC8E3',
  '#F4A261', '#2A9D8F', '#E76F51', '#264653', '#A8DADC',
];

let nextIndex = 0;

export function getNextColor(usedColors: string[]): string {
  // Try to find an unused color from the palette
  for (const color of PALETTE) {
    if (!usedColors.includes(color)) return color;
  }
  // Fallback: cycle through palette
  const color = PALETTE[nextIndex % PALETTE.length];
  nextIndex++;
  return color;
}
