const sharp = require('sharp');

const width = 2860;
const height = 1360;
const svg = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="rgba(15,23,42,0.10)"/>
    </filter>
  </defs>
  <g filter="url(#shadow)">
    <rect x="322" y="320" width="780" height="293" rx="36" fill="rgba(239,68,68,0.08)" stroke="rgba(239,68,68,0.72)" stroke-width="6"/>
    <rect x="1949" y="320" width="780" height="293" rx="36" fill="rgba(59,130,246,0.08)" stroke="rgba(59,130,246,0.72)" stroke-width="6"/>
    <rect x="322" y="965" width="1686" height="350" rx="40" fill="rgba(245,158,11,0.08)" stroke="rgba(245,158,11,0.78)" stroke-width="6"/>
    <g>
      <rect x="344" y="250" width="306" height="64" rx="32" fill="rgba(254,226,226,0.98)" stroke="rgba(239,68,68,0.28)" stroke-width="2"/>
      <text x="380" y="292" font-family="Geist, Inter, Arial, sans-serif" font-size="30" font-weight="700" fill="#B91C1C" letter-spacing="0.02em">REVENUE AT RISK</text>
    </g>
    <g>
      <rect x="1971" y="250" width="276" height="64" rx="32" fill="rgba(219,234,254,0.98)" stroke="rgba(59,130,246,0.28)" stroke-width="2"/>
      <text x="2007" y="292" font-family="Geist, Inter, Arial, sans-serif" font-size="30" font-weight="700" fill="#1D4ED8" letter-spacing="0.02em">RECOVERY RATE</text>
    </g>
    <g>
      <rect x="344" y="905" width="246" height="64" rx="32" fill="rgba(254,243,199,0.98)" stroke="rgba(245,158,11,0.30)" stroke-width="2"/>
      <text x="380" y="947" font-family="Geist, Inter, Arial, sans-serif" font-size="30" font-weight="700" fill="#B45309" letter-spacing="0.02em">FLAGGED CALLS</text>
    </g>
  </g>
</svg>`;

sharp('public/landing/dashboard-preview-final.png')
  .composite([{ input: Buffer.from(svg), blend: 'over' }])
  .png()
  .toFile('public/landing/dashboard-preview-proof-annotated.png')
  .then(() => console.log('annotated-done'))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
