const fs = require('fs');
let content = fs.readFileSync('eda-website/src/App.tsx', 'utf8');

const tRu = `    seq1: "Миллионы сырых транзакций формируют океан шума.",\n    seq2: "Внезапный всплеск активности за 30 дней выдает аномалию.",\n    seq3: "Ablation-фильтр сжигает лишние признаки (Noise Reduction).",\n    seq4: "Идеальный сигнал найден: эскалация точна на 99%.",\n`;
const tEn = `    seq1: "Millions of raw transactions form an ocean of noise.",\n    seq2: "A sudden burst of activity in 30 days reveals an anomaly.",\n    seq3: "Ablation filter burns away redundant features (Noise Reduction).",\n    seq4: "Perfect signal isolated: 99% precise escalation.",\n`;
const tUz = `    seq1: "Millionlab xom tranzaksiyalar shovqin ummonini hosil qiladi.",\n    seq2: "30 kun ichidagi to'satdan faollik anomaliyani oshkor qiladi.",\n    seq3: "Ablation filtri ortiqcha belgilarni yo'q qiladi (Noise Reduction).",\n    seq4: "Mukammal signal topildi: eskalyatsiya 99% aniq.",\n`;

content = content.replace(/(ru: \{[\s\S]*?)(heroTitle:)/, `$1${tRu}    $2`);
content = content.replace(/(en: \{[\s\S]*?)(heroTitle:)/, `$1${tEn}    $2`);
content = content.replace(/(uz: \{[\s\S]*?)(heroTitle:)/, `$1${tUz}    $2`);

// Inject texts into CanvasSequence usage
content = content.replace(
  '<CanvasSequence \n        frameCount={240}',
  '<CanvasSequence \n        texts={[t.seq1, t.seq2, t.seq3, t.seq4]}\n        frameCount={240}'
);

fs.writeFileSync('eda-website/src/App.tsx', content, 'utf8');
console.log('App.tsx updated');
