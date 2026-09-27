const fs = require('fs');
let content = fs.readFileSync('eda-website/src/App.tsx', 'utf8');

// The hero text was spaced out, so we need a broader regex or just replace the substring.
content = content.replace('Идеальный сигнал.', '{t.heroTitle2}');

// Replace SYSTEM: OVERFITTING_PROTECTION_ACTIVE with the new AML title
content = content.replace(
    'SYSTEM: OVERFITTING_PROTECTION_ACTIVE', 
    'AML Alert Prioritization'
);

// We can add the requested full background for the hero text by adding some classes
// Let's also add an immersive scanline effect in CSS
let css = fs.readFileSync('eda-website/src/index.css', 'utf8');
if (!css.includes('.scanlines')) {
    css += `
/* Immersive Cyber Effects */
.scanlines {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0),
    rgba(255, 255, 255, 0) 50%,
    rgba(0, 0, 0, 0.25) 50%,
    rgba(0, 0, 0, 0.25)
  );
  background-size: 100% 4px;
  z-index: 10;
  opacity: 0.15;
}

.glow-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  box-shadow: inset 0 0 100px rgba(13, 242, 201, 0.1);
  z-index: 10;
}
`;
    fs.writeFileSync('eda-website/src/index.css', css, 'utf8');
}

// Inject scanlines into HeroSection
content = content.replace(
    '<div className="absolute inset-0 bg-gradient-to-r from-[#030708] via-[#030708]/60 to-transparent pointer-events-none z-[1]"></div>',
    '<div className="absolute inset-0 bg-gradient-to-r from-[#030708] via-[#030708]/60 to-transparent pointer-events-none z-[1]"></div>\\n      <div className="scanlines"></div>\\n      <div className="glow-overlay"></div>'
);

fs.writeFileSync('eda-website/src/App.tsx', content, 'utf8');
console.log('Fixed hero text and added immersive effects.');
