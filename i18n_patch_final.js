const fs = require('fs');
let content = fs.readFileSync('eda-website/src/App.tsx', 'utf8');

// Update translations object to add missing keys
const transTarget = `    targetDistDesc: "Большинство алертов закрываются (Dismissed). Доля эскалированных (Escalated) составляет {rate}. Анализ распределения целевой переменной показывает сильный дисбаланс классов, что потребовало применения стратифицированной кросс-валидации (Stratified K-Fold) при обучении ансамбля.",`;

const additionalRu = `
    scrollDown: "Прокрутить вниз",
    timeActivityChart: "График активности во времени",
    transactionHistogram: "Гистограмма транзакций",
    burstActivityChart: "Всплеск активности перед алертом",
    outcomeChart: "Типы транзакций по исходу",
    date: "Дата",
    activityLevel: "Активность",
    cat1: "Обычная", cat2: "Корпоративная", cat3: "Перевод", cat4: "Кредит", cat5: "Депозит", cat6: "Снятие", cat7: "Пополнение", cat8: "Международная"
`;
const additionalEn = `
    scrollDown: "Scroll down",
    timeActivityChart: "Activity over time chart",
    transactionHistogram: "Transaction histogram",
    burstActivityChart: "Activity burst before alert",
    outcomeChart: "Transaction types by outcome",
    date: "Date",
    activityLevel: "Activity Level",
    cat1: "Regular", cat2: "Corporate", cat3: "Transfer", cat4: "Credit", cat5: "Deposit", cat6: "Withdrawal", cat7: "Top-up", cat8: "International"
`;
const additionalUz = `
    scrollDown: "Pastga aylantirish",
    timeActivityChart: "Vaqt o'tishi bilan faollik grafigi",
    transactionHistogram: "Tranzaksiyalar gistogrammasi",
    burstActivityChart: "Tetiklanishdan oldin faollik portlashi",
    outcomeChart: "Natija bo'yicha tranzaksiya turlari",
    date: "Sana",
    activityLevel: "Faollik darajasi",
    cat1: "Odatiy", cat2: "Korporativ", cat3: "O'tkazma", cat4: "Kredit", cat5: "Depozit", cat6: "Yechish", cat7: "To'ldirish", cat8: "Xalqaro"
`;

content = content.replace(
    'targetDistDesc: "Большинство алертов закрываются (Dismissed). Доля эскалированных (Escalated) составляет {rate}. Анализ распределения целевой переменной показывает сильный дисбаланс классов, что потребовало применения стратифицированной кросс-валидации (Stratified K-Fold) при обучении ансамбля.",',
    transTarget + additionalRu
);

content = content.replace(
    'targetDistDesc: "Most alerts are dismissed. The escalated rate is {rate}. Target variable analysis shows strong class imbalance, which required using Stratified K-Fold cross-validation when training the ensemble.",',
    'targetDistDesc: "Most alerts are dismissed. The escalated rate is {rate}. Target variable analysis shows strong class imbalance, which required using Stratified K-Fold cross-validation when training the ensemble.",' + additionalEn
);

content = content.replace(
    'targetDistDesc: "Aksariyat signallar yopiladi (Dismissed). Eskalatsiya qilinganlar ulushi {rate}. Maqsadli o\'zgaruvchining tahlili kuchli sinf nomutanosibligini ko\'rsatadi, bu esa ansamblni o\'qitishda tabaqalashtirilgan (Stratified K-Fold) usulni talab qildi.",',
    'targetDistDesc: "Aksariyat signallar yopiladi (Dismissed). Eskalatsiya qilinganlar ulushi {rate}. Maqsadli o\'zgaruvchining tahlili kuchli sinf nomutanosibligini ko\'rsatadi, bu esa ansamblni o\'qitishda tabaqalashtirilgan (Stratified K-Fold) usulni talab qildi.",' + additionalUz
);

// Apply translations in the JSX markup
content = content.replace('"Прокрутить вниз"', 't.scrollDown');
content = content.replace('"График активности во времени"', 't.timeActivityChart');
content = content.replace('"Гистограмма транзакций"', 't.transactionHistogram');
content = content.replace('"Всплеск активности перед алертом"', 't.burstActivityChart');
content = content.replace('"Типы транзакций по исходу"', 't.outcomeChart');

content = content.replace('>Транзакций<', '>{t.transactions}<');
content = content.replace('>Транзакций<', '>{t.transactions}<'); // second occurrence
content = content.replace('>Типы транзакций<', '>{t.transactionTypes}<'); // in SVG
content = content.replace('>Дата<', '>{t.date}<');
content = content.replace('>Алертокоен<', '>{t.activityLevel}<');

// Replace categories
content = content.replace('>Обычная<', '>{t.cat1}<');
content = content.replace('>Корпоративная<', '>{t.cat2}<');
content = content.replace('>Перевод<', '>{t.cat3}<');
content = content.replace('>Кредит<', '>{t.cat4}<');
content = content.replace('>Депозит<', '>{t.cat5}<');
content = content.replace('>Снятие<', '>{t.cat6}<');
content = content.replace('>Пополнение<', '>{t.cat7}<');
content = content.replace('>Международная<', '>{t.cat8}<');

// Complex blocks of text that failed last time
content = content.replace('Динамика транзакций в окне 30 дней до генерации алерта.', '{t.timeActivityDesc1}');
content = content.replace('Заметно резкое увеличение объема операций за несколько дней до фиксации подозрительной активности системой.', '{t.timeActivityDesc2}');
content = content.replace('Сводная статистика по основным категориям денежных переводов в исторической выборке.', '{t.transactionTypesDesc1}');
content = content.replace('Значительная часть объема приходится на корпоративные и обычные переводы, что характерно для банковского сектора.', '{t.transactionTypesDesc2}');
content = content.replace('Ключевой поведенческий паттерн "Escalated" алертов: аномальная концентрация крупных сумм (burst) в узком временном окне перед срабатыванием.', '{t.patternBurstDesc}');
content = content.replace('Распределение типов транзакций (Karta, Bank Otkazmasi, Naqd, Xalqaro) и их направлений (Kirim/Chiqim) в разрезе исхода алертов.', '{t.typesByOutcomeDesc1}');
content = content.replace('На графике видно, что эскалированные случаи имеют аномальное распределение по типам переводов по сравнению с ложными срабатываниями.', '{t.typesByOutcomeDesc2}');
content = content.replace('Заключение и основные выводы', '{t.conclusionTitle}');
content = content.replace('В ходе разведочного анализа данных мы выявили, что базовые признаки (тип и направление транзакций) несут наиболее сильный сигнал, в то время как временные "окна" (windows) и сложные агрегации создают много шума и ведут к переобучению на исторических данных.', '{t.conclusion1}');
content = content.replace('Эскалированные алерты характеризуются резким всплеском специфических транзакций в дни, непосредственно предшествующие срабатыванию системы. На основе этих инсайтов мы провели строгий отбор признаков, отсекли шумовые переменные и построили робастный ансамбль моделей. Это позволило нам не только повысить ROC-AUC на кросс-валидации, но и гарантировать устойчивость модели на скрытой тестовой выборке.', '{t.conclusion2}');
content = content.replace('Большинство алертов закрываются (Dismissed). Доля эскалированных (Escalated) составляет {data.rate}. \\r\\n                Анализ распределения целевой переменной показывает сильный дисбаланс классов, что потребовало применения стратифицированной кросс-валидации (Stratified K-Fold) при обучении ансамбля.', '{t.targetDistDesc.replace("{rate}", data.rate)}');
content = content.replace(/Большинство алертов закрываются \(Dismissed\)\. Доля эскалированных \(Escalated\) составляет \{data\.rate\}\.[\s\S]*?при обучении ансамбля\./g, '{t.targetDistDesc.replace("{rate}", data.rate)}');


fs.writeFileSync('eda-website/src/App.tsx', content, 'utf8');
console.log('Deep translation replacement complete.');
