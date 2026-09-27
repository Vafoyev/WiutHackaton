const fs = require('fs');
let content = fs.readFileSync('eda-website/src/App.tsx', 'utf8');

content = content.replace(/Идеальный сигнал\./, '{t.heroTitle2}');
content = content.replace(/Команда DnkCode/g, '{t.teamInfo}');

fs.writeFileSync('eda-website/src/App.tsx', content, 'utf8');
