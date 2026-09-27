const fs = require('fs');

let content = fs.readFileSync('eda-website/src/App.tsx', 'utf8');

content = content.replace("Океан шума.", "{t.heroTitle1}");
content = content.replace("Идеальный сигнал.", "{t.heroTitle2}");
content = content.replace("Мы построили систему приоритизации AML-алертов, основанную на строгой математике, доказательном отборе признаков и защите от переобучения.", "{t.heroDesc}");

content = content.replace("Тренировочных алертов", "{t.trainingAlerts}");
content = content.replace(">Транзакций<", ">{t.transactions}<");
content = content.replace("Отобранных признаков", "{t.selectedFeatures}");
content = content.replace("CV ROC-AUC", "{t.cvRocAuc}");

content = content.replace("В поисках паттернов: Разведочный анализ (EDA)", "{t.edaTitle}");

content = content.replace(">Активность во времени<", ">{t.timeActivity}<");
content = content.replace("Динамика транзакций в окне 30 дней до генерации алерта.", "{t.timeActivityDesc1}");
content = content.replace("Заметно резкое увеличение объема операций за несколько дней до фиксации подозрительной активности системой.", "{t.timeActivityDesc2}");
content = content.replace(">Дни до срабатывания<", ">{t.daysToAlert}<");
content = content.replace('transform="rotate(-90)" x="-110" y="12">Транзакции<', 'transform="rotate(-90)" x="-110" y="12">{t.transactions}<');

content = content.replace("Категории транзакций", "{t.transactionTypes}");
content = content.replace("Сводная статистика по основным категориям денежных переводов в исторической выборке.", "{t.transactionTypesDesc1}");
content = content.replace("Значительная часть объема приходится на корпоративные и обычные переводы, что характерно для банковского сектора.", "{t.transactionTypesDesc2}");

content = content.replace("Паттерн: Всплеск активности", "{t.patternBurst}");
content = content.replace('Ключевой поведенческий паттерн "Escalated" алертов: аномальная концентрация крупных сумм (burst) в узком временном окне перед срабатыванием.', "{t.patternBurstDesc}");
content = content.replace(">Время<", ">{t.timeLabel}<");
content = content.replace(">Сумма (IQR)<", ">{t.amountIqr}<");

content = content.replace("Типы транзакций в зависимости от исхода", "{t.typesByOutcome}");
content = content.replace("Распределение типов транзакций (Karta, Bank Otkazmasi, Naqd, Xalqaro) и их направлений (Kirim/Chiqim) в разрезе исхода алертов.", "{t.typesByOutcomeDesc1}");
content = content.replace("На графике видно, что эскалированные случаи имеют аномальное распределение по типам переводов по сравнению с ложными срабатываниями.", "{t.typesByOutcomeDesc2}");
content = content.replace(">Total<", ">{t.total}<");
content = content.replace(">Escalated<", ">{t.escalated}<");
content = content.replace(">Dismissed<", ">{t.dismissed}<");

content = content.replace("Распределение таргета (Target Distribution)", "{t.targetDistTitle}");
content = content.replace(/Большинство алертов закрываются \(Dismissed\)\. Доля эскалированных \(Escalated\) составляет \{data.rate\}\.[\s\S]*?при обучении ансамбля\./, "{t.targetDistDesc.replace('{rate}', data.rate)}");

content = content.replace("Больше данных ≠ Лучше. Отсечение шума.", "{t.ablationTitle}");
content = content.replace(/Мы измерили семейства признаков строгой кросс-валидацией\.[\s\S]*?\(Adversarial AUC \{data\.adversarial\}\)\./, "{t.ablationDesc.replace('{rejected}', data.rejected_families.toString()).replace('{chance}', data.chance_families.toString()).replace('{drift}', data.drift_verdict).replace('{adv}', data.adversarial)}");
content = content.replace(">Family added<", ">{t.familyAdded}<");
content = content.replace(">Columns<", ">{t.columns}<");
content = content.replace(">Decision<", ">{t.decision}<");
content = content.replace('? "kept" : "rejected"', '? t.kept : t.rejected');

content = content.replace("Заключение и основные выводы", "{t.conclusionTitle}");
content = content.replace('В ходе разведочного анализа данных мы выявили, что базовые признаки (тип и направление транзакций) несут наиболее сильный сигнал, в то время как временные "окна" (windows) и сложные агрегации создают много шума и ведут к переобучению на исторических данных.', "{t.conclusion1}");
content = content.replace("Эскалированные алерты характеризуются резким всплеском специфических транзакций в дни, непосредственно предшествующие срабатыванию системы. На основе этих инсайтов мы провели строгий отбор признаков, отсекли шумовые переменные и построили робастный ансамбль моделей. Это позволило нам не только повысить ROC-AUC на кросс-валидации, но и гарантировать устойчивость модели на скрытой тестовой выборке.", "{t.conclusion2}");

content = content.replace("Команда DnkCode", "{t.teamInfo}");

fs.writeFileSync('eda-website/src/App.tsx', content, 'utf8');
console.log("I18n strings replaced via Node.");
