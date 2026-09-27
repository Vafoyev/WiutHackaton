const fs = require('fs');
let content = fs.readFileSync('eda-website/src/App.tsx', 'utf8');

// The translation dictionary is mostly correct but let's make sure there are no raw Russian strings in it besides the `ru:` block.
// We will target the specific JSX strings by searching for the Russian text directly.

const replacements = [
    [/aria-label="Прокрутить вниз"/g, 'aria-label={t.scrollDown}'],
    [/aria-label="График активности во времени"/g, 'aria-label={t.timeActivityChart}'],
    [/aria-label="Гистограмма транзакций"/g, 'aria-label={t.transactionHistogram}'],
    [/aria-label="Всплеск активности перед алертом"/g, 'aria-label={t.burstActivityChart}'],
    [/aria-label="Типы транзакций по исходу"/g, 'aria-label={t.outcomeChart}'],

    [/>Обычная</g, '>{t.cat1}<'],
    [/>Корпоративная</g, '>{t.cat2}<'],
    [/>Перевод</g, '>{t.cat3}<'],
    [/>Кредит</g, '>{t.cat4}<'],
    [/>Депозит</g, '>{t.cat5}<'],
    [/>Снятие</g, '>{t.cat6}<'],
    [/>Пополнение</g, '>{t.cat7}<'],
    [/>Международная</g, '>{t.cat8}<'],

    [/>Транзакций</g, '>{t.transactions}<'],
    [/>Типы транзакций</g, '>{t.transactionTypes}<'],
    [/>Дата</g, '>{t.date}<'],
    [/>Алертокоен</g, '>{t.activityLevel}<'],
    [/>Время</g, '>{t.timeLabel}<'],
    [/>Сумма \(IQR\)</g, '>{t.amountIqr}<'],
    
    [/>Идеальный сигнал\.</g, '>{t.heroTitle2}<'],
    [/>\s*Мы построили систему приоритизации AML-алертов[\s\S]*?переобучения\.\s*</g, '>{t.heroDesc}<'],
    [/>\s*Динамика транзакций в окне 30 дней до генерации алерта\.\s*</g, '>{t.timeActivityDesc1}<'],
    [/>\s*Заметно резкое увеличение объема операций[\s\S]*?системой\.\s*</g, '>{t.timeActivityDesc2}<'],
    [/>\s*Сводная статистика по основным категориям денежных переводов в исторической выборке\.\s*</g, '>{t.transactionTypesDesc1}<'],
    [/>\s*Значительная часть объема приходится на корпоративные и обычные переводы[\s\S]*?сектора\.\s*</g, '>{t.transactionTypesDesc2}<'],
    [/>\s*Ключевой поведенческий паттерн "Escalated" алертов: аномальная концентрация крупных сумм \(burst\) в узком временном окне перед срабатыванием\.\s*</g, '>{t.patternBurstDesc}<'],
    [/>\s*Распределение типов транзакций \(Karta, Bank Otkazmasi, Naqd, Xalqaro\) и их направлений \(Kirim\/Chiqim\) в разрезе исхода алертов\.\s*</g, '>{t.typesByOutcomeDesc1}<'],
    [/>\s*На графике видно, что эскалированные случаи имеют аномальное распределение по типам переводов по сравнению с ложными срабатываниями\.\s*</g, '>{t.typesByOutcomeDesc2}<'],
    [/>\s*Заключение и основные выводы\s*</g, '>{t.conclusionTitle}<'],
    [/>\s*В ходе разведочного анализа данных мы выявили, что базовые признаки[\s\S]*?исторических данных\.\s*</g, '>{t.conclusion1}<'],
    [/>\s*Эскалированные алерты характеризуются резким всплеском специфических транзакций в дни, непосредственно предшествующие срабатыванию системы\.[\s\S]*?тестовой выборке\.\s*</g, '>{t.conclusion2}<'],
];

for (const [regex, replacement] of replacements) {
    content = content.replace(regex, replacement);
}

fs.writeFileSync('eda-website/src/App.tsx', content, 'utf8');
console.log('Regex replacements done!');
