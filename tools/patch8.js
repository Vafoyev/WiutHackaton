const fs = require('fs');
let content = fs.readFileSync('eda-website/src/App.tsx', 'utf8');

// Fix the ru: block string variables that were incorrectly assigned as t.propertyName
content = content.replace('scrollDown: t.scrollDown', 'scrollDown: "Прокрутить вниз"');
content = content.replace('timeActivityChart: t.timeActivityChart', 'timeActivityChart: "График активности во времени"');
content = content.replace('transactionHistogram: t.transactionHistogram', 'transactionHistogram: "Гистограмма транзакций"');
content = content.replace('burstActivityChart: t.burstActivityChart', 'burstActivityChart: "Всплеск активности перед алертом"');
content = content.replace('outcomeChart: t.outcomeChart', 'outcomeChart: "Типы транзакций по исходу"');

// Fix translation values in ru block that were accidentally replaced with {t.someKey} 
content = content.replace('heroTitle2: "{t.heroTitle2}"', 'heroTitle2: "Идеальный сигнал."');
content = content.replace('teamInfo: "{t.teamInfo}"', 'teamInfo: "Команда DnkCode"');
content = content.replace('timeActivityDesc1: "{t.timeActivityDesc1}"', 'timeActivityDesc1: "Динамика транзакций в окне 30 дней до генерации алерта."');
content = content.replace('timeActivityDesc2: "{t.timeActivityDesc2}"', 'timeActivityDesc2: "Заметно резкое увеличение объема операций за несколько дней до фиксации подозрительной активности системой."');
content = content.replace('transactionTypesDesc1: "{t.transactionTypesDesc1}"', 'transactionTypesDesc1: "Сводная статистика по основным категориям денежных переводов в исторической выборке."');
content = content.replace('transactionTypesDesc2: "{t.transactionTypesDesc2}"', 'transactionTypesDesc2: "Значительная часть объема приходится на корпоративные и обычные переводы, что характерно для банковского сектора."');
content = content.replace("patternBurstDesc: '{t.patternBurstDesc}'", 'patternBurstDesc: "Ключевой поведенческий паттерн \\"Escalated\\" алертов: аномальная концентрация крупных сумм (burst) в узком временном окне перед срабатыванием."');
content = content.replace('typesByOutcomeDesc1: "{t.typesByOutcomeDesc1}"', 'typesByOutcomeDesc1: "Распределение типов транзакций (Karta, Bank Otkazmasi, Naqd, Xalqaro) и их направлений (Kirim/Chiqim) в разрезе исхода алертов."');
content = content.replace('typesByOutcomeDesc2: "{t.typesByOutcomeDesc2}"', 'typesByOutcomeDesc2: "На графике видно, что эскалированные случаи имеют аномальное распределение по типам переводов по сравнению с ложными срабатываниями."');

fs.writeFileSync('eda-website/src/App.tsx', content, 'utf8');
console.log('Fixed ru dict');
