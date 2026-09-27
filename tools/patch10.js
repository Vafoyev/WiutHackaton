const fs = require('fs');
let content = fs.readFileSync('eda-website/src/App.tsx', 'utf8');

if (!content.includes("import { CanvasSequence } from './components/CanvasSequence';")) {
    content = "import { CanvasSequence } from './components/CanvasSequence';\n" + content;
}

content = content.replace('(index) =>', '(index: number) =>');

fs.writeFileSync('eda-website/src/App.tsx', content, 'utf8');
