const fs = require('fs');
let content = fs.readFileSync('eda-website/src/App.tsx', 'utf8');

// Fix missing commas
content = content.replace(/"Международная"\n/g, '"Международная",\n');
content = content.replace(/"International"\n/g, '"International",\n');
content = content.replace(/"Xalqaro"\n/g, '"Xalqaro",\n');

// Fix translation issues in Russian dictionary
content = content.replace('conclusionTitle: "{t.conclusionTitle}"', 'conclusionTitle: "Заключение и основные выводы"');
content = content.replace('conclusion1: "В ходе разведочного анализа', 'conclusion1: "В ходе разведочного анализа'); // It's fine
content = content.replace('conclusion2: "{t.conclusion2}"', 'conclusion2: "Эскалированные алерты характеризуются резким всплеском специфических транзакций в дни, непосредственно предшествующие срабатыванию системы. На основе этих инсайтов мы провели строгий отбор признаков, отсекли шумовые переменные и построили робастный ансамбль моделей. Это позволило нам не только повысить ROC-AUC на кросс-валидации, но и гарантировать устойчивость модели на скрытой тестовой выборке."');

fs.writeFileSync('eda-website/src/App.tsx', content, 'utf8');
