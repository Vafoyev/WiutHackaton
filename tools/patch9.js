const fs = require('fs');
let content = fs.readFileSync('eda-website/src/App.tsx', 'utf8');

// Add import for CanvasSequence if not already there
if (!content.includes('import { CanvasSequence }')) {
    content = content.replace(
        "import React, { useState, useEffect, useRef, useMemo, createContext, useContext } from 'react';",
        "import React, { useState, useEffect, useRef, useMemo, createContext, useContext } from 'react';\nimport { CanvasSequence } from './components/CanvasSequence';"
    );
}

// Insert CanvasSequence right after the HeroSection
const targetInsertionPoint = `<footer className="relative z-10 w-full flex justify-center items-center pb-2">`;
const sequenceBlock = `      {/* --- SCROLL-BOUND VIDEO SEQUENCE --- */}
      <CanvasSequence 
        frameCount={240} 
        getFrameUrl={(index) => \`/video-frames/frame_\${index}.webp\`} 
      />
      
      `;

if (!content.includes('<CanvasSequence')) {
    content = content.replace(targetInsertionPoint, sequenceBlock + targetInsertionPoint);
}

fs.writeFileSync('eda-website/src/App.tsx', content, 'utf8');
console.log('Injected CanvasSequence into App.tsx');
