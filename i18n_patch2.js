const fs = require('fs');

let content = fs.readFileSync('eda-website/src/App.tsx', 'utf8');

const contextCode = `import React, { useEffect, useRef, useState, createContext, useContext } from 'react';
import * as THREE from 'three';
import './App.css';

const translations = {
  ru: {
    heroTitle1: "Океан шума.",
    heroTitle2: "Идеальный сигнал.",
    heroDesc: "Мы построили систему приоритизации AML-алертов, основанную на строгой математике, доказательном отборе признаков и защите от переобучения.",
    trainingAlerts: "Тренировочных алертов",
    transactions: "Транзакций",
    selectedFeatures: "Отобранных признаков",
    cvRocAuc: "CV ROC-AUC",
    edaTitle: "В поисках паттернов: Разведочный анализ (EDA)",
    timeActivity: "Активность во времени",
    timeActivityDesc1: "Динамика транзакций в окне 30 дней до генерации алерта.",
    timeActivityDesc2: "Заметно резкое увеличение объема операций за несколько дней до фиксации подозрительной активности системой.",
    daysToAlert: "Дни до срабатывания",
    transactionTypes: "Категории транзакций",
    transactionTypesDesc1: "Сводная статистика по основным категориям денежных переводов в исторической выборке.",
    transactionTypesDesc2: "Значительная часть объема приходится на корпоративные и обычные переводы, что характерно для банковского сектора.",
    patternBurst: "Паттерн: Всплеск активности",
    patternBurstDesc: 'Ключевой поведенческий паттерн "Escalated" алертов: аномальная концентрация крупных сумм (burst) в узком временном окне перед срабатыванием.',
    timeLabel: "Время",
    amountIqr: "Сумма (IQR)",
    typesByOutcome: "Типы транзакций в зависимости от исхода",
    typesByOutcomeDesc1: "Распределение типов транзакций (Karta, Bank Otkazmasi, Naqd, Xalqaro) и их направлений (Kirim/Chiqim) в разрезе исхода алертов.",
    typesByOutcomeDesc2: "На графике видно, что эскалированные случаи имеют аномальное распределение по типам переводов по сравнению с ложными срабатываниями.",
    targetDistTitle: "Распределение таргета (Target Distribution)",
    targetDistDesc: "Большинство алертов закрываются (Dismissed). Доля эскалированных (Escalated) составляет {rate}. Анализ распределения целевой переменной показывает сильный дисбаланс классов, что потребовало применения стратифицированной кросс-валидации (Stratified K-Fold) при обучении ансамбля.",
    ablationTitle: "Больше данных ≠ Лучше. Отсечение шума.",
    ablationDesc: "Мы измерили семейства признаков строгой кросс-валидацией. Точность достигла пика на компактном наборе. Добавление остальных только снижало ROC-AUC. Из отвергнутых: {rejected}, из них на уровне случайности: {chance}. Drift: {drift} (Adversarial AUC {adv}).",
    familyAdded: "Family added",
    columns: "Columns",
    decision: "Decision",
    conclusionTitle: "Заключение и основные выводы",
    conclusion1: "В ходе разведочного анализа данных мы выявили, что базовые признаки (тип и направление транзакций) несут наиболее сильный сигнал, в то время как временные \\"окна\\" (windows) и сложные агрегации создают много шума и ведут к переобучению на исторических данных.",
    conclusion2: "Эскалированные алерты характеризуются резким всплеском специфических транзакций в дни, непосредственно предшествующие срабатыванию системы. На основе этих инсайтов мы провели строгий отбор признаков, отсекли шумовые переменные и построили робастный ансамбль моделей. Это позволило нам не только повысить ROC-AUC на кросс-валидации, но и гарантировать устойчивость модели на скрытой тестовой выборке.",
    teamInfo: "Команда DnkCode",
    langSelector: "Ru",
    kept: "kept",
    rejected: "rejected",
    total: "Total",
    escalated: "Escalated",
    dismissed: "Dismissed"
  },
  en: {
    heroTitle1: "An Ocean of Noise.",
    heroTitle2: "The Perfect Signal.",
    heroDesc: "We built an AML alert prioritization system based on rigorous mathematics, evidence-based feature selection, and overfitting protection.",
    trainingAlerts: "Training alerts",
    transactions: "Transactions",
    selectedFeatures: "Selected features",
    cvRocAuc: "CV ROC-AUC",
    edaTitle: "In Search of Patterns: Exploratory Data Analysis (EDA)",
    timeActivity: "Activity Over Time",
    timeActivityDesc1: "Transaction dynamics in a 30-day window before alert generation.",
    timeActivityDesc2: "A sharp increase in transaction volume is noticeable a few days before suspicious activity is flagged.",
    daysToAlert: "Days to alert",
    transactionTypes: "Transaction Categories",
    transactionTypesDesc1: "Summary statistics on the main categories of money transfers in the historical sample.",
    transactionTypesDesc2: "A significant portion of the volume comes from corporate and regular transfers, typical for the banking sector.",
    patternBurst: "Pattern: Activity Burst",
    patternBurstDesc: 'Key behavioral pattern for "Escalated" alerts: anomalous concentration of large amounts (burst) in a narrow time window before triggering.',
    timeLabel: "Time",
    amountIqr: "Amount (IQR)",
    typesByOutcome: "Transaction Types by Outcome",
    typesByOutcomeDesc1: "Distribution of transaction types (Karta, Bank Otkazmasi, Naqd, Xalqaro) and directions (Kirim/Chiqim) by alert outcome.",
    typesByOutcomeDesc2: "The chart shows escalated cases have an anomalous distribution of transfer types compared to false positives.",
    targetDistTitle: "Target Distribution",
    targetDistDesc: "Most alerts are dismissed. The escalated rate is {rate}. Target variable analysis shows strong class imbalance, which required using Stratified K-Fold cross-validation when training the ensemble.",
    ablationTitle: "More Data ≠ Better. Noise Reduction.",
    ablationDesc: "We evaluated feature families using rigorous cross-validation. Accuracy peaked on a compact set. Adding the rest only lowered ROC-AUC. Rejected: {rejected}, at random level: {chance}. Drift: {drift} (Adversarial AUC {adv}).",
    familyAdded: "Family added",
    columns: "Columns",
    decision: "Decision",
    conclusionTitle: "Conclusion and Key Takeaways",
    conclusion1: "During EDA, we found that basic features (transaction type and direction) carry the strongest signal, while time windows and complex aggregations create noise and lead to overfitting on historical data.",
    conclusion2: "Escalated alerts are characterized by a sharp burst of specific transactions in the days immediately preceding the system trigger. Based on these insights, we conducted strict feature selection and built a robust ensemble of models, guaranteeing stability on the hidden test set.",
    teamInfo: "Team DnkCode",
    langSelector: "En",
    kept: "kept",
    rejected: "rejected",
    total: "Total",
    escalated: "Escalated",
    dismissed: "Dismissed"
  },
  uz: {
    heroTitle1: "Shovqin ummoni.",
    heroTitle2: "Mukammal signal.",
    heroDesc: "Biz qat'iy matematika, isbotlangan belgilar tanlovi va haddan tashqari moslashishdan himoyalanishga asoslangan AML signallarini ustuvorlashtirish tizimini qurdik.",
    trainingAlerts: "O'quv signallari",
    transactions: "Tranzaksiyalar",
    selectedFeatures: "Tanlangan belgilar",
    cvRocAuc: "CV ROC-AUC",
    edaTitle: "Naqshlarni qidirishda: Qidiruv ma'lumotlarini tahlil qilish (EDA)",
    timeActivity: "Vaqt o'tishi bilan faollik",
    timeActivityDesc1: "Signal yaratilishidan oldin 30 kunlik darchadagi tranzaksiya dinamikasi.",
    timeActivityDesc2: "Tizim shubhali faollikni qayd etishidan bir necha kun oldin operatsiyalar hajmining keskin oshishi seziladi.",
    daysToAlert: "Signalga qolgan kunlar",
    transactionTypes: "Tranzaksiya Toifalari",
    transactionTypesDesc1: "Tarixiy namunadagi pul o'tkazmalarining asosiy toifalari bo'yicha yig'ma statistika.",
    transactionTypesDesc2: "Hajmning katta qismi bank sektori uchun xos bo'lgan korporativ va oddiy o'tkazmalarga to'g'ri keladi.",
    patternBurst: "Naqsh: Faollik portlashi",
    patternBurstDesc: 'Eskalatsiya qilingan signallarning asosiy xulq-atvor naqshi: tetiklanishdan oldin tor vaqt darchasida katta miqdorlarning (burst) g\\'ayritabiiy to\\'planishi.',
    timeLabel: "Vaqt",
    amountIqr: "Miqdor (IQR)",
    typesByOutcome: "Natijaga ko'ra tranzaksiya turlari",
    typesByOutcomeDesc1: "Signal natijasi bo'yicha tranzaksiya turlari (Karta, Bank Otkazmasi, Naqd, Xalqaro) va yo'nalishlari (Kirim/Chiqim) taqsimoti.",
    typesByOutcomeDesc2: "Grafik shuni ko'rsatadiki, eskalatsiya qilingan holatlar yolg'on ijobiy natijalarga nisbatan o'tkazma turlari bo'yicha g'ayritabiiy taqsimotga ega.",
    targetDistTitle: "Target Taqsimoti",
    targetDistDesc: "Aksariyat signallar yopiladi (Dismissed). Eskalatsiya qilinganlar ulushi {rate}. Maqsadli o'zgaruvchining tahlili kuchli sinf nomutanosibligini ko'rsatadi, bu esa ansamblni o'qitishda tabaqalashtirilgan (Stratified K-Fold) usulni talab qildi.",
    ablationTitle: "Ko'proq Ma'lumot ≠ Yaxshiroq. Shovqinni kamaytirish.",
    ablationDesc: "Biz belgi oilalarini qat'iy kesish-tekshirish yordamida o'lchadik. Aniqlik ixcham to'plamda eng yuqori darajaga yetdi. Qolganlarini qo'shish faqat ROC-AUCni pasaytirdi. Rad etildi: {rejected}, tasodif darajasida: {chance}. Drift: {drift} (Adversarial AUC {adv}).",
    familyAdded: "Family added",
    columns: "Columns",
    decision: "Decision",
    conclusionTitle: "Xulosa va asosiy natijalar",
    conclusion1: "Qidiruv ma'lumotlarini tahlil qilish davomida biz asosiy belgilar (tranzaksiya turi va yo'nalishi) eng kuchli signalni berishini, vaqt darchalari va murakkab yig'ishlar esa shovqin yaratib, haddan tashqari moslashishga olib kelishini aniqladik.",
    conclusion2: "Eskalatsiya qilingan signallar tizim tetiklanishidan darhol oldin ma'lum tranzaksiyalarning keskin o'sishi bilan tavsiflanadi. Ushbu tushunchalarga asoslanib, biz qat'iy xususiyatlarni tanlashni o'tkazdik va yashirin sinov to'plamida barqarorlikni kafolatlaydigan modellarning mustahkam ansamblini qurdik.",
    teamInfo: "DnkCode Jamoasi",
    langSelector: "Uz",
    kept: "kept",
    rejected: "rejected",
    total: "Total",
    escalated: "Escalated",
    dismissed: "Dismissed"
  }
};

const LanguageContext = createContext('ru');
`;

content = content.replace(
  /import React, \{ useEffect, useRef \} from 'react';\r?\nimport '\.\/index\.css';/,
  contextCode + "\\n"
);

content = content.replace('function HeroSection() {', 'function HeroSection() {\\n  const lang = useContext(LanguageContext);\\n  const t = translations[lang as keyof typeof translations];');
content = content.replace('function EdaSection() {', 'function EdaSection() {\\n  const lang = useContext(LanguageContext);\\n  const t = translations[lang as keyof typeof translations];');

const appComponent = `function App() {
  const [lang, setLang] = useState('ru');
  return (
    <LanguageContext.Provider value={lang}>
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        {['ru', 'en', 'uz'].map((l) => (
          <button 
            key={l}
            onClick={() => setLang(l)}
            className={"px-3 py-1 text-xs font-mono uppercase rounded border transition-colors " + (lang === l ? "bg-[#22f396]/20 border-[#22f396] text-[#22f396]" : "bg-black/50 border-cyan-900/50 text-slate-400 hover:border-[#22f396]/50")}
          >
            {l}
          </button>
        ))}
      </div>
      <HeroSection />
      <EdaSection />
    </LanguageContext.Provider>
  );
}
`;

content = content.replace(/function App\(\) \{\r?\n\s*return \(\r?\n\s*<>\r?\n\s*<HeroSection \/>\r?\n\s*<EdaSection \/>\r?\n\s*<\/>\r?\n\s*\);\r?\n\}/, appComponent);

content = content.replace(">Океан шума.<", ">{t.heroTitle1}<");
content = content.replace(">Идеальный сигнал.<", ">{t.heroTitle2}<");
content = content.replace(">Мы построили систему приоритизации AML-алертов, основанную на строгой математике, доказательном отборе признаков и защите от переобучения.<", ">{t.heroDesc}<");

content = content.replace(">Тренировочных алертов<", ">{t.trainingAlerts}<");
content = content.replace(">Транзакций<", ">{t.transactions}<");
content = content.replace(">Отобранных признаков<", ">{t.selectedFeatures}<");
content = content.replace(">CV ROC-AUC<", ">{t.cvRocAuc}<");

content = content.replace(">В поисках паттернов: Разведочный анализ (EDA)<", ">{t.edaTitle}<");

content = content.replace(">Активность во времени<", ">{t.timeActivity}<");
content = content.replace(">Динамика транзакций в окне 30 дней до генерации алерта.<", ">{t.timeActivityDesc1}<");
content = content.replace(">Заметно резкое увеличение объема операций за несколько дней до фиксации подозрительной активности системой.<", ">{t.timeActivityDesc2}<");
content = content.replace(">Дни до срабатывания<", ">{t.daysToAlert}<");

content = content.replace('transform="rotate(-90)" x="-110" y="12">Транзакции<', 'transform="rotate(-90)" x="-110" y="12">{t.transactions}<');

content = content.replace(">Категории транзакций<", ">{t.transactionTypes}<");
content = content.replace(">Сводная статистика по основным категориям денежных переводов в исторической выборке.<", ">{t.transactionTypesDesc1}<");
content = content.replace(">Значительная часть объема приходится на корпоративные и обычные переводы, что характерно для банковского сектора.<", ">{t.transactionTypesDesc2}<");

content = content.replace(">Паттерн: Всплеск активности<", ">{t.patternBurst}<");
content = content.replace('>Ключевой поведенческий паттерн "Escalated" алертов: аномальная концентрация крупных сумм (burst) в узком временном окне перед срабатыванием.<', ">{t.patternBurstDesc}<");
content = content.replace(">Время<", ">{t.timeLabel}<");
content = content.replace(">Сумма (IQR)<", ">{t.amountIqr}<");

content = content.replace(">Типы транзакций в зависимости от исхода<", ">{t.typesByOutcome}<");
content = content.replace(">Распределение типов транзакций (Karta, Bank Otkazmasi, Naqd, Xalqaro) и их направлений (Kirim/Chiqim) в разрезе исхода алертов.<", ">{t.typesByOutcomeDesc1}<");
content = content.replace(">На графике видно, что эскалированные случаи имеют аномальное распределение по типам переводов по сравнению с ложными срабатываниями.<", ">{t.typesByOutcomeDesc2}<");
content = content.replace(">Total<", ">{t.total}<");
content = content.replace(">Escalated<", ">{t.escalated}<");
content = content.replace(">Dismissed<", ">{t.dismissed}<");

content = content.replace(">Распределение таргета (Target Distribution)<", ">{t.targetDistTitle}<");

// Target dist replace specific text
const targetDistStr = "Большинство алертов закрываются (Dismissed). Доля эскалированных (Escalated) составляет {data.rate}. Анализ распределения целевой переменной показывает сильный дисбаланс классов, что потребовало применения стратифицированной кросс-валидации (Stratified K-Fold) при обучении ансамбля.";
content = content.replace(targetDistStr, "{t.targetDistDesc.replace('{rate}', data.rate)}");

content = content.replace(">Больше данных ≠ Лучше. Отсечение шума.<", ">{t.ablationTitle}<");

const ablationStr = "Мы измерили семейства признаков строгой кросс-валидацией. Точность достигла пика на компактном наборе. Добавление остальных только снижало ROC-AUC. Из отвергнутых: {data.rejected_families}, из них на уровне случайности: {data.chance_families}. Drift: {data.drift_verdict} (Adversarial AUC {data.adversarial}).";
content = content.replace(ablationStr, "{t.ablationDesc.replace('{rejected}', data.rejected_families.toString()).replace('{chance}', data.chance_families.toString()).replace('{drift}', data.drift_verdict).replace('{adv}', data.adversarial.toString())}");


content = content.replace(">Family added<", ">{t.familyAdded}<");
content = content.replace(">Columns<", ">{t.columns}<");
content = content.replace(">Decision<", ">{t.decision}<");
content = content.replace('? "kept" : "rejected"', '? t.kept : t.rejected');

content = content.replace(">Заключение и основные выводы<", ">{t.conclusionTitle}<");
content = content.replace('>В ходе разведочного анализа данных мы выявили, что базовые признаки (тип и направление транзакций) несут наиболее сильный сигнал, в то время как временные "окна" (windows) и сложные агрегации создают много шума и ведут к переобучению на исторических данных.<', ">{t.conclusion1}<");
content = content.replace(">Эскалированные алерты характеризуются резким всплеском специфических транзакций в дни, непосредственно предшествующие срабатыванию системы. На основе этих инсайтов мы провели строгий отбор признаков, отсекли шумовые переменные и построили робастный ансамбль моделей. Это позволило нам не только повысить ROC-AUC на кросс-валидации, но и гарантировать устойчивость модели на скрытой тестовой выборке.<", ">{t.conclusion2}<");

content = content.replace(">Команда DnkCode<", ">{t.teamInfo}<");

fs.writeFileSync('eda-website/src/App.tsx', content, 'utf8');
console.log("I18n strings safely replaced via Node.");
