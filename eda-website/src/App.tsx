import { CanvasSequence } from './components/CanvasSequence';
import { useEffect, useRef, useState, createContext, useContext } from 'react';
import './index.css';

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
    patternBurstDesc: "Ключевой поведенческий паттерн \"Escalated\" алертов: аномальная концентрация крупных сумм (burst) в узком временном окне перед срабатыванием.",
    timeLabel: "Время",
    amountIqr: "Сумма (IQR)",
    typesByOutcome: "Типы транзакций в зависимости от исхода",
    typesByOutcomeDesc1: "Распределение типов транзакций (Karta, Bank Otkazmasi, Naqd, Xalqaro) и их направлений (Kirim/Chiqim) в разрезе исхода алертов.",
    typesByOutcomeDesc2: "На графике видно, что эскалированные случаи имеют аномальное распределение по типам переводов по сравнению с ложными срабатываниями.",
    targetDistTitle: "Распределение таргета (Target Distribution)",
        targetDistDesc: "Большинство алертов закрываются (Dismissed). Доля эскалированных (Escalated) составляет {rate}. Анализ распределения целевой переменной показывает сильный дисбаланс классов, что потребовало применения стратифицированной кросс-валидации (Stratified K-Fold) при обучении ансамбля.",
    scrollDown: "Прокрутить вниз",
    timeActivityChart: "График активности во времени",
    transactionHistogram: "Гистограмма транзакций",
    burstActivityChart: "Всплеск активности перед алертом",
    outcomeChart: "Типы транзакций по исходу",
    date: "Дата",
    activityLevel: "Активность",
    cat1: "Обычная", cat2: "Корпоративная", cat3: "Перевод", cat4: "Кредит", cat5: "Депозит", cat6: "Снятие", cat7: "Пополнение", cat8: "Международная",

    ablationTitle: "Больше данных ≠ Лучше. Отсечение шума.",
    ablationDesc: "Мы измерили семейства признаков строгой кросс-валидацией. Точность достигла пика на компактном наборе. Добавление остальных только снижало ROC-AUC. Из отвергнутых: {rejected}, из них на уровне случайности: {chance}. Drift: {drift} (Adversarial AUC {adv}).",
    familyAdded: "Family added",
    columns: "Columns",
    decision: "Decision",
    conclusionTitle: "Заключение и основные выводы",
    conclusion1: "В ходе разведочного анализа данных мы выявили, что базовые признаки (тип и направление транзакций) несут наиболее сильный сигнал, в то время как временные \"окна\" (windows) и сложные агрегации создают много шума и ведут к переобучению на исторических данных.",
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
    scrollDown: "Scroll down",
    timeActivityChart: "Activity over time chart",
    transactionHistogram: "Transaction histogram",
    burstActivityChart: "Activity burst before alert",
    outcomeChart: "Transaction types by outcome",
    date: "Date",
    activityLevel: "Activity Level",
    cat1: "Regular", cat2: "Corporate", cat3: "Transfer", cat4: "Credit", cat5: "Deposit", cat6: "Withdrawal", cat7: "Top-up", cat8: "International",

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
    patternBurstDesc: 'Eskalatsiya qilingan signallarning asosiy xulq-atvor naqshi: tetiklanishdan oldin tor vaqt darchasida katta miqdorlarning (burst) g\'ayritabiiy to\'planishi.',
    timeLabel: "Vaqt",
    amountIqr: "Miqdor (IQR)",
    typesByOutcome: "Natijaga ko'ra tranzaksiya turlari",
    typesByOutcomeDesc1: "Signal natijasi bo'yicha tranzaksiya turlari (Karta, Bank Otkazmasi, Naqd, Xalqaro) va yo'nalishlari (Kirim/Chiqim) taqsimoti.",
    typesByOutcomeDesc2: "Grafik shuni ko'rsatadiki, eskalatsiya qilingan holatlar yolg'on ijobiy natijalarga nisbatan o'tkazma turlari bo'yicha g'ayritabiiy taqsimotga ega.",
    targetDistTitle: "Target Taqsimoti",
    targetDistDesc: "Aksariyat signallar yopiladi (Dismissed). Eskalatsiya qilinganlar ulushi {rate}. Maqsadli o'zgaruvchining tahlili kuchli sinf nomutanosibligini ko'rsatadi, bu esa ansamblni o'qitishda tabaqalashtirilgan (Stratified K-Fold) usulni talab qildi.",
    scrollDown: "Pastga aylantirish",
    timeActivityChart: "Vaqt o'tishi bilan faollik grafigi",
    transactionHistogram: "Tranzaksiyalar gistogrammasi",
    burstActivityChart: "Tetiklanishdan oldin faollik portlashi",
    outcomeChart: "Natija bo'yicha tranzaksiya turlari",
    date: "Sana",
    activityLevel: "Faollik darajasi",
    cat1: "Odatiy", cat2: "Korporativ", cat3: "O'tkazma", cat4: "Kredit", cat5: "Depozit", cat6: "Yechish", cat7: "To'ldirish", cat8: "Xalqaro",

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

// --- Mock Data ---
const data = {
  alerts: "55,234",
  transactions: "1,240,500",
  columns: "25",
  auc: "0.6376",
  rate: "2.1%",
  chance_families: 3,
  drift_verdict: "indistinguishable",
  adversarial: "0.4956",
  rejected_families: 18,
  selection_history: [
    { family: "base", n_columns: 7, mean: 0.5683, accepted: false },
    { family: "amount_shape", n_columns: 11, mean: 0.5453, accepted: false },
    { family: "direction_type", n_columns: 24, mean: 0.6020, accepted: true },
    { family: "cross", n_columns: 16, mean: 0.5106, accepted: false },
    { family: "flow", n_columns: 4, mean: 0.5218, accepted: false },
    { family: "windows", n_columns: 46, mean: 0.5372, accepted: false },
    { family: "burst", n_columns: 7, mean: 0.5009, accepted: false },
    { family: "hour", n_columns: 7, mean: 0.5029, accepted: false },
    { family: "signal_date", n_columns: 6, mean: 0.4974, accepted: false },
    { family: "base", n_columns: 31, mean: 0.6161, accepted: true },
    { family: "amount_shape", n_columns: 35, mean: 0.5982, accepted: false },
    { family: "cross", n_columns: 40, mean: 0.5956, accepted: false },
    { family: "flow", n_columns: 28, mean: 0.5976, accepted: false },
    { family: "windows", n_columns: 70, mean: 0.5905, accepted: false },
    { family: "burst", n_columns: 31, mean: 0.5944, accepted: false },
    { family: "hour", n_columns: 31, mean: 0.5962, accepted: false },
    { family: "signal_date", n_columns: 30, mean: 0.5952, accepted: false },
    { family: "amount_shape", n_columns: 42, mean: 0.6133, accepted: false },
    { family: "cross", n_columns: 47, mean: 0.6123, accepted: false },
    { family: "flow", n_columns: 35, mean: 0.6137, accepted: false },
    { family: "windows", n_columns: 77, mean: 0.6078, accepted: false },
    { family: "burst", n_columns: 38, mean: 0.6112, accepted: false },
    { family: "hour", n_columns: 38, mean: 0.6131, accepted: false },
    { family: "signal_date", n_columns: 37, mean: 0.6109, accepted: false }
  ]
};

function HeroSection() {
  const lang = useContext(LanguageContext);
  const t = translations[lang as keyof typeof translations];
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    
    // @ts-ignore
    const THREE = window.THREE;
    if (!THREE) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, width / height, 1, 3000);
    camera.position.set(200, 300, 700);
    camera.lookAt(100, 50, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Clear old canvases if any
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);

    const cols = 150;
    const rows = 90;
    const count = cols * rows;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const basePositions = new Float32Array(count * 3);

    const colorGreen = new THREE.Color(0x00ff88);
    const colorCyan = new THREE.Color(0x00e5ff);
    const colorDim = new THREE.Color(0x004433);

    let idx = 0;
    const spacingX = 14;
    const spacingZ = 12;
    const offsetX = (cols * spacingX) / 2 - 250;
    const offsetZ = (rows * spacingZ) / 2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * spacingX - offsetX;
        const z = r * spacingZ - offsetZ;
        const y = 0;

        positions[idx * 3] = x;
        positions[idx * 3 + 1] = y;
        positions[idx * 3 + 2] = z;

        basePositions[idx * 3] = x;
        basePositions[idx * 3 + 1] = y;
        basePositions[idx * 3 + 2] = z;

        const t = (c / cols) * 0.7 + (r / rows) * 0.3;
        const pColor = new THREE.Color().lerpColors(colorGreen, colorCyan, Math.sin(t * Math.PI));
        if (r % 4 === 0 || c % 4 === 0) {
          pColor.lerp(colorDim, 0.4);
        }

        colors[idx * 3] = pColor.r;
        colors[idx * 3 + 1] = pColor.g;
        colors[idx * 3 + 2] = pColor.b;

        idx++;
      }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if(ctx) {
      const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.3, 'rgba(0, 255, 170, 0.9)');
      grad.addColorStop(0.7, 'rgba(0, 200, 255, 0.3)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(16, 16, 16, 0, Math.PI * 2);
      ctx.fill();
    }

    const particleTexture = new THREE.CanvasTexture(canvas);

    const material = new THREE.PointsMaterial({
      size: 7.5,
      vertexColors: true,
      map: particleTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const particleSystem = new THREE.Points(geometry, material);
    scene.add(particleSystem);

    const orbCount = 60;
    const orbGeo = new THREE.BufferGeometry();
    const orbPos = new Float32Array(orbCount * 3);
    const orbCol = new Float32Array(orbCount * 3);
    for (let i = 0; i < orbCount; i++) {
      orbPos[i * 3] = (Math.random() - 0.2) * 1200;
      orbPos[i * 3 + 1] = Math.random() * 350 - 50;
      orbPos[i * 3 + 2] = (Math.random() - 0.5) * 800;
      
      orbCol[i * 3] = 0.0;
      orbCol[i * 3 + 1] = 0.9 + Math.random() * 0.1;
      orbCol[i * 3 + 2] = 0.5 + Math.random() * 0.5;
    }
    orbGeo.setAttribute('position', new THREE.BufferAttribute(orbPos, 3));
    orbGeo.setAttribute('color', new THREE.BufferAttribute(orbCol, 3));
    const orbMat = new THREE.PointsMaterial({
      size: 14,
      vertexColors: true,
      map: particleTexture,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const orbPoints = new THREE.Points(orbGeo, orbMat);
    scene.add(orbPoints);

    const clock = new THREE.Clock();
    let mouseX = 0;
    let mouseY = 0;

    const onMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX - window.innerWidth / 2) * 0.05;
      mouseY = (e.clientY - window.innerHeight / 2) * 0.05;
    };
    window.addEventListener('mousemove', onMouseMove);

    let animationId: number;
    function animate() {
      animationId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime() * 0.8;
      const posArr = geometry.attributes.position.array as Float32Array;

      let i = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          // const baseX = basePositions[i * 3];
          const baseZ = basePositions[i * 3 + 2];

          const wave1 = Math.sin(c * 0.12 + time * 1.5) * 85;
          const wave2 = Math.cos(r * 0.08 + time * 1.1) * 65;
          const wave3 = Math.sin((c + r) * 0.05 + time * 0.9) * 45;
          const wave4 = Math.sin(c * 0.04 - baseZ * 0.002 + time * 2.0) * 40;

          const rightWeight = Math.max(0, (c - 30) / (cols - 30));
          const elevation = (wave1 + wave2 + wave3 + wave4) * (0.6 + rightWeight * 1.2);

          posArr[i * 3 + 1] = elevation;
          i++;
        }
      }
      geometry.attributes.position.needsUpdate = true;

      camera.position.x += (200 + mouseX - camera.position.x) * 0.02;
      camera.position.y += (300 - mouseY - camera.position.y) * 0.02;
      camera.lookAt(100, 30, 0);

      const oArr = orbGeo.attributes.position.array as Float32Array;
      for (let j = 0; j < orbCount; j++) {
        oArr[j * 3 + 1] += Math.sin(time + j) * 0.3;
      }
      orbGeo.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    }

    animate();

    const handleResize = () => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', onMouseMove);
      renderer.dispose();
    };
  }, []);

  return (
    <section className="relative w-full min-h-screen flex flex-col justify-between bg-[#030708] overflow-hidden px-8 sm:px-14 md:px-20 lg:px-24 py-8 md:py-12" data-purpose="hero-section">
      <div className="absolute inset-0 w-full h-full pointer-events-none z-0" style={{ display: 'block' }}>
        <div ref={containerRef} style={{ width: '100%', height: '100%' }}></div>
      </div>
      
      <div className="absolute inset-0 bg-gradient-to-r from-[#030708] via-[#030708]/60 to-transparent pointer-events-none z-[1]"></div>\n      <div className="scanlines"></div>\n      <div className="glow-overlay"></div>
      
      <header className="relative z-10 w-full flex items-start justify-between">
        <div className="flex items-start space-x-6 sm:space-x-8">
          <div className="flex flex-col items-start pt-0.5">
            <span className="text-xs font-mono text-[#8b9ba7] font-semibold tracking-wider leading-none">01</span>
            <span className="text-[9px] font-mono uppercase text-[#475b68] tracking-wider leading-tight mt-1">HERO</span>
            <span className="text-[9px] font-mono uppercase text-[#475b68] tracking-wider leading-none">SECTION</span>
            <div className="w-[1.5px] h-10 bg-[#3a4d5b]/70 mt-2.5 ml-[1px]"></div>
          </div>
          
          <div className="flex items-baseline pt-0.5">
            <a className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-baseline select-none" href="#">
              <span className="text-white font-semibold">Dnk</span>
              <span className="text-[#22f396] neon-logo-glow font-bold ml-[1px]">Code</span>
            </a>
          </div>
        </div>
        
        <div className="text-right pt-1">
          <span className="font-mono text-xs sm:text-[13px] tracking-widest text-[#4e6473] uppercase">
            TEAM ID: <span className="text-[#647c8c] tracking-normal font-semibold">2ABB3C78</span>
          </span>
        </div>
      </header>
      
      <main className="relative z-10 max-w-3xl my-auto py-12 md:py-16">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full border border-[#22f396]/60 bg-[#22f396]/10 neon-pill-glow mb-8">
          <span className="w-2 h-2 rounded-full bg-[#22f396] neon-dot-pulse"></span>
          <span className="font-mono text-[11px] sm:text-xs tracking-wider text-[#22f396] font-medium uppercase">
            AML Alert Prioritization
          </span>
        </div>
        
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.08] mb-7">
          <span className="block text-white">{t.heroTitle1}</span>
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#22f396] via-[#0df2c9] to-[#22f396] neon-text-glow mt-1.5">
            {t.heroTitle2}
          </span>
        </h1>
        
        <p className="max-w-2xl text-sm sm:text-base md:text-[17px] text-[#788e9f] leading-relaxed font-normal">{t.heroDesc}</p>
      </main>
      
      
      <footer className="relative z-10 w-full flex justify-center items-center pb-2">
        <a aria-label={t.scrollDown} className="text-[#526b7c] hover:text-[#22f396] transition-colors duration-300 p-2" href="#details">
          <svg className="w-4 h-4 stroke-current transition-transform duration-300 hover:translate-y-0.5" fill="none" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" strokeLinecap="round" strokeLinejoin="round"></path>
          </svg>
        </a>
      </footer>
    </section>
  );
}

function EdaSection() {
  const lang = useContext(LanguageContext);
  const t = translations[lang as keyof typeof translations];
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let width: number, height: number;
    let nodes: any[] = [];

    function resize() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = document.body.scrollHeight;
      initNodes();
    }

    function initNodes() {
      nodes = [];
      const nodeCount = Math.floor((width * window.innerHeight) / 22000) + 35;
      for (let i = 0; i < nodeCount; i++) {
        nodes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          radius: Math.random() * 1.5 + 1
        });
      }
    }

    let animId: number;
    function draw() {
      if(!ctx) return;
      ctx.clearRect(0, 0, width, height);

      ctx.strokeStyle = 'rgba(70, 95, 140, 0.15)';
      ctx.lineWidth = 0.8;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 140) {
            const alpha = (1 - dist / 140) * 0.25;
            ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.x += n.vx;
        n.y += n.vy;

        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;

        ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    }

    window.addEventListener('resize', resize);
    setTimeout(resize, 500);
    draw();
    
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animId);
    }
  }, []);

  return (
    <div id="details" className="relative min-h-screen font-sans flex flex-col items-center p-4 md:p-8 space-y-16">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-50"></canvas>
      
      <div className="absolute -right-20 top-1/4 w-[480px] h-[480px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute left-1/3 top-1/3 w-[360px] h-[360px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none z-0"></div>

      <main className="relative z-10 w-full max-w-[1360px] bg-[#050b12] rounded-2xl overflow-hidden border border-cyan-950/40 shadow-2xl flex flex-col p-6 sm:p-10 mb-8 mt-4">
        <h2 className="text-3xl md:text-5xl font-normal tracking-wide text-white drop-shadow-md text-center mb-8">AML Alert Prioritization</h2>
        <section className="relative z-10 w-full flex-1 flex flex-wrap items-center justify-around px-2 py-8 my-auto">
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 hidden lg:block" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="cyberBeam" x1="0%" x2="100%" y1="0%" y2="0%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.2"></stop>
                <stop offset="40%" stopColor="#10b981" stopOpacity="0.75"></stop>
                <stop offset="70%" stopColor="#06b6d4" stopOpacity="0.85"></stop>
                <stop offset="100%" stopColor="#4ade80" stopOpacity="0.9"></stop>
              </linearGradient>
            </defs>
            <path d="M 220 150 C 350 150, 450 150, 500 150" fill="none" stroke="url(#cyberBeam)" strokeDasharray="4 3" strokeWidth="1.5"></path>
            <path d="M 650 150 C 750 150, 850 150, 950 150" fill="none" stroke="url(#cyberBeam)" strokeDasharray="3 2" strokeWidth="1.5"></path>
          </svg>

          <div className="relative z-10 flex flex-col items-center flex-1 min-w-[200px] m-4">
            <div className="relative w-40 h-40 sm:w-44 sm:h-44 flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full animate-spin-reverse" viewBox="0 0 160 160">
                <circle cx="80" cy="80" fill="none" r="72" stroke="#0f293d" strokeWidth="2"></circle>
                <path className="glow-cyan" d="M 80,8 A 72,72 0 1,1 25,126" fill="none" stroke="#06b6d4" strokeLinecap="round" strokeWidth="3"></path>
                <path d="M 80,18 A 62,62 0 0,1 142,80" fill="none" stroke="#34d399" strokeLinecap="round" strokeWidth="3.5"></path>
                <path d="M 35,120 A 62,62 0 0,0 80,142" fill="none" opacity="0.8" stroke="#22d3ee" strokeLinecap="round" strokeWidth="2"></path>
              </svg>
              <div className="w-32 h-32 rounded-full border border-cyan-500/30 bg-[#07131d]/60 backdrop-blur-sm flex items-center justify-center shadow-[inset_0_0_15px_rgba(6,182,212,0.15)]">
                <span className="font-hud text-3xl sm:text-4xl font-semibold text-white tracking-wider glow-text">{data.alerts}</span>
              </div>
            </div>
            <p className="mt-4 text-[13px] sm:text-sm font-light text-slate-300/80 tracking-wide text-center">{t.trainingAlerts}</p>
          </div>

          <div className="relative z-10 flex flex-col items-center flex-1 min-w-[200px] m-4">
            <div className="relative w-44 h-44 sm:w-48 sm:h-48 flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full animate-spin-slow" viewBox="0 0 180 180">
                <circle cx="90" cy="90" fill="none" opacity="0.6" r="82" stroke="#0ea5e9" strokeDasharray="3 5 8 5" strokeWidth="1.8"></circle>
                <circle className="glow-cyan" cx="90" cy="90" fill="none" opacity="0.9" r="74" stroke="#10b981" strokeDasharray="1 3" strokeLinecap="round" strokeWidth="4.5"></circle>
                <path d="M 90,16 A 74,74 0 0,1 164,90" fill="none" stroke="#34d399" strokeLinecap="round" strokeWidth="4"></path>
                <path d="M 40,140 A 74,74 0 0,0 90,164" fill="none" stroke="#06b6d4" strokeWidth="2.5"></path>
              </svg>
              <svg className="absolute inset-0 w-full h-full animate-spin-reverse opacity-70" viewBox="0 0 180 180">
                <circle cx="90" cy="90" fill="none" r="63" stroke="#22d3ee" strokeDasharray="16 10 4 10" strokeWidth="1.5"></circle>
                <circle cx="90" cy="90" fill="none" r="54" stroke="#065f46" strokeWidth="1"></circle>
              </svg>
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border border-teal-400/40 bg-[#071720]/75 backdrop-blur-md flex items-center justify-center shadow-[inset_0_0_20px_rgba(20,184,166,0.2)]">
                <span className="font-hud text-3xl sm:text-4xl font-semibold text-white tracking-wider glow-text">{data.transactions}</span>
              </div>
            </div>
            <p className="mt-4 text-[13px] sm:text-sm font-light text-slate-300/80 tracking-wide text-center">{t.transactions}</p>
          </div>

          <div className="relative z-10 flex flex-col items-center flex-1 min-w-[200px] m-4">
            <div className="relative w-40 h-40 sm:w-44 sm:h-44 flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full animate-spin-slow" viewBox="0 0 160 160">
                <circle cx="80" cy="80" fill="none" opacity="0.6" r="70" stroke="#064e3b" strokeWidth="1.5"></circle>
                <path className="glow-cyan" d="M 80,10 A 70,70 0 0,1 150,80" fill="none" stroke="#4ade80" strokeLinecap="round" strokeWidth="3"></path>
                <path d="M 80,150 A 70,70 0 0,1 10,80" fill="none" stroke="#06b6d4" strokeLinecap="round" strokeWidth="2.5"></path>
              </svg>
              <svg className="absolute inset-0 w-full h-full animate-spin-reverse opacity-80" viewBox="0 0 160 160">
                <circle cx="80" cy="80" fill="none" r="58" stroke="#10b981" strokeDasharray="10 8" strokeWidth="1.5"></circle>
              </svg>
              <div className="w-28 h-28 sm:w-30 sm:h-30 rounded-full border border-emerald-500/30 bg-[#06141a]/70 backdrop-blur-sm flex items-center justify-center shadow-[inset_0_0_15px_rgba(16,185,129,0.2)]">
                <span className="font-hud text-3xl sm:text-4xl font-semibold text-white tracking-wider glow-text">{data.columns}</span>
              </div>
            </div>
            <p className="mt-4 text-[13px] sm:text-sm font-light text-slate-300/80 tracking-wide text-center">{t.selectedFeatures}</p>
          </div>

          <div className="relative z-10 flex flex-col items-center flex-[1.4] min-w-[280px] m-4">
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center animate-pulse-glow">
              <svg className="absolute inset-0 w-full h-full animate-spin-slow pointer-events-none" viewBox="0 0 280 280">
                <circle className="glow-cyan-lg" cx="140" cy="140" fill="none" r="130" stroke="url(#vortexGrad)" strokeDasharray="2 6 12 5 28 8" strokeLinecap="round" strokeWidth="4.5"></circle>
                <circle cx="140" cy="140" fill="none" opacity="0.6" r="122" stroke="#38bdf8" strokeDasharray="1 4" strokeWidth="1.5"></circle>
              </svg>
              <svg className="absolute inset-0 w-full h-full animate-spin-reverse pointer-events-none" viewBox="0 0 280 280">
                <defs>
                  <linearGradient id="vortexGrad" x1="0%" x2="100%" y1="0%" y2="100%">
                    <stop offset="0%" stopColor="#4ade80"></stop>
                    <stop offset="45%" stopColor="#22d3ee"></stop>
                    <stop offset="85%" stopColor="#3b82f6"></stop>
                    <stop offset="100%" stopColor="#a855f7"></stop>
                  </linearGradient>
                </defs>
                <path className="glow-cyan" d="M 140,25 A 115,115 0 0,1 255,140" fill="none" stroke="#4ade80" strokeLinecap="round" strokeWidth="4"></path>
                <path d="M 255,140 A 115,115 0 0,1 140,255" fill="none" stroke="#22d3ee" strokeDasharray="8 6" strokeWidth="3"></path>
                <circle cx="140" cy="140" fill="none" opacity="0.8" r="106" stroke="#2dd4bf" strokeDasharray="30 14 10 14" strokeWidth="2"></circle>
              </svg>
              <svg className="absolute inset-0 w-full h-full animate-spin-fast pointer-events-none" viewBox="0 0 280 280">
                <circle cx="140" cy="140" fill="none" opacity="0.75" r="92" stroke="#67e8f9" strokeDasharray="5 15" strokeWidth="2"></circle>
              </svg>
              <div className="w-48 h-48 sm:w-52 sm:h-52 rounded-full border-2 border-emerald-400/60 bg-gradient-to-br from-[#06242c]/90 via-[#03151f]/90 to-[#020b12]/95 backdrop-blur-md flex flex-col items-center justify-center shadow-[inset_0_0_35px_rgba(52,211,153,0.35),0_0_25px_rgba(34,211,238,0.25)]">
                <span className="font-hud text-5xl sm:text-6xl font-bold tracking-tight text-[#6ee7b7] glow-text">{data.auc}</span>
              </div>
            </div>
            <p className="mt-2 text-sm sm:text-base font-medium text-slate-300 tracking-wider text-center">{t.cvRocAuc}</p>
          </div>
        </section>
        <div className="relative z-10 w-full flex items-center justify-between text-[11px] text-slate-600 font-mono tracking-widest pt-2">
          <span className="opacity-40">SYSTEM // TELEMETRY LINK ACTIVE</span>
          <span className="opacity-40">QUANT_METRICS_V4.2</span>
        </div>
      </main>

      {/* --- ALL 5 ARTICLES FROM YOUR ORIGINAL DESIGN --- */}
      <section className="relative z-10 w-full max-w-[1400px] flex flex-col items-center px-4">
        <header className="w-full text-center mb-8 md:mb-12">
          <h2 className="text-3xl md:text-4xl font-normal tracking-wide text-white drop-shadow-md">{t.edaTitle}</h2>
        </header>
        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10">
          
          {/* ==========================================
                 TOP-LEFT SECTION: Time Series Activity
            =========================================== */}
          <article className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch" data-purpose="chart-card-group">
            <div className="md:col-span-7 flex flex-col justify-end pt-4 pr-2">
              <div className="relative w-full aspect-[16/10] sm:aspect-[16/9]">
                <svg aria-label={t.timeActivityChart} className="w-full h-full overflow-visible" viewBox="0 0 460 260">
                  <defs>
                    <linearGradient id="neonGradient1" x1="0%" x2="100%" y1="0%" y2="0%">
                      <stop offset="0%" stopColor="#00f2fe"></stop>
                      <stop offset="65%" stopColor="#00f2fe"></stop>
                      <stop offset="85%" stopColor="#a3e635"></stop>
                      <stop offset="100%" stopColor="#4ade80"></stop>
                    </linearGradient>
                  </defs>
                  <g stroke="#232d42" strokeDasharray="0" strokeWidth="1">
                    <line x1="45" x2="440" y1="20" y2="20"></line>
                    <line x1="45" x2="440" y1="65" y2="65"></line>
                    <line x1="45" x2="440" y1="110" y2="110"></line>
                    <line x1="45" x2="440" y1="155" y2="155"></line>
                    <line x1="45" x2="440" y1="200" y2="200"></line>
                  </g>
                  <g fill="#94a3b8" fontFamily="sans-serif" fontSize="10">
                    <text textAnchor="end" x="40" y="24">1000</text>
                    <text textAnchor="end" x="40" y="69">800</text>
                    <text textAnchor="end" x="40" y="114">600</text>
                    <text textAnchor="end" x="40" y="159">400</text>
                    <text textAnchor="end" x="40" y="204">200</text>
                    <text textAnchor="end" x="40" y="222">0</text>
                    <text fill="#64748b" fontSize="9" textAnchor="middle" x="45" y="235">Day -30</text>
                    <text textAnchor="middle" x="135" y="235">Day -20</text>
                    <text textAnchor="middle" x="230" y="235">Day -10</text>
                    <text textAnchor="middle" x="325" y="235">Day -5</text>
                    <text textAnchor="middle" x="410" y="235">Alert Date</text>
                    <text fill="#cbd5e1" fontSize="11" textAnchor="middle" x="235" y="255">{t.daysToAlert}</text>
                    <text fill="#cbd5e1" fontSize="11" textAnchor="middle" transform="rotate(-90)" x="-110" y="12">{t.transactions}</text>
                  </g>
                  <path className="glow-cyan" d="M 45,215 L 50,210 L 53,195 L 55,145 L 57,190 L 63,212 L 72,210 L 80,205 
                                         L 88,212 L 95,198 L 102,185 L 110,195 L 118,170 L 126,178 L 132,165 
                                         L 138,185 L 145,150 L 150,170 L 157,142 L 165,180 L 172,130 L 178,162 
                                         L 186,145 L 194,175 L 202,135 L 210,165 L 216,140 L 225,180 L 235,115 
                                         L 242,165 L 250,135 L 258,185 L 265,130 L 273,150 L 280,105 L 288,140 
                                         L 295,95 L 302,170 L 310,120 L 318,160 L 325,82 L 332,150 L 340,90 
                                         L 348,155 L 355,80 L 362,175 L 370,110 L 378,60 L 385,160 L 392,80 
                                         L 400,30 L 406,120 L 413,85 L 420,130 L 426,170" fill="none" stroke="url(#neonGradient1)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.6"></path>
                </svg>
              </div>
            </div>
            <div className="md:col-span-5 glass-card rounded-2xl p-6 sm:p-7 flex flex-col justify-center">
              <h2 className="text-white text-lg font-medium mb-4">{t.timeActivity}</h2>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">{t.timeActivityDesc1}</p>
              <p className="text-slate-400 text-sm leading-relaxed">{t.timeActivityDesc2}</p>
            </div>
          </article>

          {/* ==========================================
                 TOP-RIGHT SECTION: Directions & Transaction Types
            =========================================== */}
          <article className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch" data-purpose="chart-card-group">
            <div className="md:col-span-7 flex flex-col justify-end pt-4 pr-2">
              <div className="relative w-full aspect-[16/10] sm:aspect-[16/9]">
                <svg aria-label={t.transactionHistogram} className="w-full h-full overflow-visible" viewBox="0 0 460 260">
                  <g stroke="#232d42" strokeWidth="1">
                    <line x1="45" x2="440" y1="20" y2="20"></line>
                    <line x1="45" x2="440" y1="56" y2="56"></line>
                    <line x1="45" x2="440" y1="92" y2="92"></line>
                    <line x1="45" x2="440" y1="128" y2="128"></line>
                    <line x1="45" x2="440" y1="164" y2="164"></line>
                    <line x1="45" x2="440" y1="200" y2="200"></line>
                  </g>
                  <g fill="#94a3b8" fontFamily="sans-serif" fontSize="10">
                    <text textAnchor="end" x="40" y="24">60M</text>
                    <text textAnchor="end" x="40" y="60">50M</text>
                    <text textAnchor="end" x="40" y="96">40M</text>
                    <text textAnchor="end" x="40" y="132">30M</text>
                    <text textAnchor="end" x="40" y="168">20M</text>
                    <text textAnchor="end" x="40" y="204">10M</text>
                    <text textAnchor="end" x="40" y="218">0</text>
                    <text fill="#cbd5e1" fontSize="11" textAnchor="middle" transform="rotate(-90)" x="-110" y="10">{t.transactions}</text>
                    <text fill="#cbd5e1" fontSize="11" textAnchor="middle" x="250" y="255">{t.transactions}</text>
                  </g>
                  <rect className="glow-cyan" fill="#00f2fe" fillOpacity="0.08" height="196" rx="3" stroke="#00f2fe" strokeWidth="2.5" width="28" x="58" y="20"></rect>
                  <rect className="glow-green" fill="#4ade80" fillOpacity="0.08" height="131" rx="3" stroke="#4ade80" strokeWidth="2.5" width="28" x="105" y="85"></rect>
                  <rect className="glow-cyan" fill="#00f2fe" fillOpacity="0.08" height="111" rx="3" stroke="#00f2fe" strokeWidth="2.5" width="28" x="152" y="105"></rect>
                  <rect className="glow-lime" fill="#a3e635" fillOpacity="0.08" height="71" rx="3" stroke="#a3e635" strokeWidth="2.5" width="28" x="199" y="145"></rect>
                  <rect className="glow-cyan" fill="#00f2fe" fillOpacity="0.08" height="74" rx="3" stroke="#00f2fe" strokeWidth="2.5" width="28" x="246" y="142"></rect>
                  <rect className="glow-cyan" fill="#00f2fe" fillOpacity="0.08" height="64" rx="3" stroke="#00f2fe" strokeWidth="2.5" width="28" x="293" y="152"></rect>
                  <rect className="glow-lime" fill="#a3e635" fillOpacity="0.08" height="38" rx="3" stroke="#a3e635" strokeWidth="2.5" width="28" x="340" y="178"></rect>
                  <rect className="glow-lime" fill="#a3e635" fillOpacity="0.08" height="32" rx="3" stroke="#a3e635" strokeWidth="2.5" width="28" x="387" y="184"></rect>
                  <g fill="#94a3b8" fontFamily="sans-serif" fontSize="9">
                    <text transform="rotate(30, 70, 226)" x="70" y="226">{t.cat1}</text>
                    <text transform="rotate(30, 117, 226)" x="117" y="226">{t.cat2}</text>
                    <text transform="rotate(30, 164, 226)" x="164" y="226">{t.cat3}</text>
                    <text transform="rotate(30, 211, 226)" x="211" y="226">{t.cat4}</text>
                    <text transform="rotate(30, 258, 226)" x="258" y="226">{t.cat5}</text>
                    <text transform="rotate(30, 305, 226)" x="305" y="226">{t.cat6}</text>
                    <text transform="rotate(30, 352, 226)" x="352" y="226">{t.cat7}</text>
                    <text transform="rotate(30, 399, 226)" x="399" y="226">{t.cat8}</text>
                  </g>
                </svg>
              </div>
            </div>
            <div className="md:col-span-5 glass-card rounded-2xl p-6 sm:p-7 flex flex-col justify-center">
              <h2 className="text-white text-lg font-medium mb-4">{t.transactionTypes}</h2>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">{t.transactionTypesDesc1}</p>
              <p className="text-slate-400 text-sm leading-relaxed">{t.transactionTypesDesc2}</p>
            </div>
          </article>

          {/* ==========================================
                 BOTTOM-LEFT SECTION: Surge Before Alert
            =========================================== */}
          <article className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch" data-purpose="chart-card-group">
            <div className="md:col-span-5 order-2 md:order-1 glass-card rounded-2xl p-6 sm:p-7 flex flex-col justify-center">
              <h2 className="text-white text-lg font-medium mb-4 leading-snug">{t.patternBurst}</h2>
              <p className="text-slate-400 text-sm leading-relaxed">{t.patternBurstDesc}</p>
            </div>
            <div className="md:col-span-7 order-1 md:order-2 flex flex-col justify-end pt-4 pr-2">
              <div className="relative w-full aspect-[16/10] sm:aspect-[16/9]">
                <svg aria-label={t.burstActivityChart} className="w-full h-full overflow-visible" viewBox="0 0 460 260">
                  <defs>
                    <linearGradient id="neonGradient2" x1="0%" x2="100%" y1="0%" y2="0%">
                      <stop offset="0%" stopColor="#4ade80"></stop>
                      <stop offset="60%" stopColor="#00f2fe"></stop>
                      <stop offset="78%" stopColor="#00f2fe"></stop>
                      <stop offset="95%" stopColor="#4ade80"></stop>
                    </linearGradient>
                  </defs>
                  <g stroke="#232d42" strokeWidth="1">
                    <line x1="45" x2="440" y1="40" y2="40"></line>
                    <line x1="45" x2="440" y1="85" y2="85"></line>
                    <line x1="45" x2="440" y1="130" y2="130"></line>
                    <line x1="45" x2="440" y1="175" y2="175"></line>
                    <line x1="45" x2="440" y1="215" y2="215"></line>
                  </g>
                  <g fill="#94a3b8" fontFamily="sans-serif" fontSize="10">
                    <text textAnchor="end" x="40" y="44">200</text>
                    <text textAnchor="end" x="40" y="89">150</text>
                    <text textAnchor="end" x="40" y="134">100</text>
                    <text textAnchor="end" x="40" y="179">50</text>
                    <text textAnchor="end" x="40" y="218">0</text>
                    <text textAnchor="middle" x="135" y="235">2010</text>
                    <text textAnchor="middle" x="210" y="235">2015</text>
                    <text textAnchor="middle" x="280" y="235">2020</text>
                    <text textAnchor="middle" x="345" y="235">2020</text>
                    <text textAnchor="middle" x="410" y="235">2020</text>
                    <text fill="#cbd5e1" fontSize="11" textAnchor="middle" x="270" y="255">{t.date}</text>
                    <text fill="#cbd5e1" fontSize="11" textAnchor="middle" transform="rotate(-90)" x="-125" y="12">{t.activityLevel}</text>
                  </g>
                  <path className="glow-cyan" d="M 52,205 C 55,200 60,195 65,198 C 70,202 75,212 85,212 
                                         C 95,212 100,202 110,203 C 120,204 125,208 135,208 
                                         C 145,208 152,196 160,198 C 170,200 178,212 188,210 
                                         C 198,208 205,196 215,197 C 225,198 230,207 240,205 
                                         C 248,203 252,185 260,186 C 268,187 274,204 282,200 
                                         C 288,197 292,175 298,170 C 304,165 308,182 314,180 
                                         C 322,176 325,145 330,140 C 335,135 340,165 344,160 
                                         C 348,155 352,125 356,85 C 360,40 366,35 370,85 
                                         C 374,130 378,160 382,125 C 386,95 390,140 395,150 
                                         C 400,160 404,180 408,165 C 412,145 418,105 422,125" fill="none" stroke="url(#neonGradient2)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.6"></path>
                </svg>
              </div>
            </div>
          </article>

          {/* ==========================================
                 BOTTOM-RIGHT SECTION: Breakdown by Outcome
            =========================================== */}
          <article className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch" data-purpose="chart-card-group">
            <div className="md:col-span-7 flex flex-col justify-end pt-4 pr-2">
              <div className="relative w-full aspect-[16/10] sm:aspect-[16/9]">
                <svg aria-label={t.outcomeChart} className="w-full h-full overflow-visible" viewBox="0 0 460 260">
                  <g stroke="#232d42" strokeWidth="1">
                    <line x1="45" x2="380" y1="20" y2="20"></line>
                    <line x1="45" x2="380" y1="56" y2="56"></line>
                    <line x1="45" x2="380" y1="92" y2="92"></line>
                    <line x1="45" x2="380" y1="128" y2="128"></line>
                    <line x1="45" x2="380" y1="164" y2="164"></line>
                    <line x1="45" x2="380" y1="200" y2="200"></line>
                  </g>
                  <g fill="#94a3b8" fontFamily="sans-serif" fontSize="10">
                    <text textAnchor="end" x="40" y="24">1</text>
                    <text textAnchor="end" x="40" y="60">0.8</text>
                    <text textAnchor="end" x="40" y="96">0.6</text>
                    <text textAnchor="end" x="40" y="132">0.4</text>
                    <text textAnchor="end" x="40" y="168">0.2</text>
                    <text textAnchor="end" x="40" y="204">0</text>
                    <text fill="#cbd5e1" fontSize="11" textAnchor="middle" transform="rotate(-90)" x="-110" y="10">{t.transactionTypes}</text>
                  </g>
                  
                  <g className="glow-cyan">
                    <rect fill="#a3e635" fillOpacity="0.1" height="6" rx="2" stroke="#a3e635" strokeWidth="2" width="28" x="58" y="24"></rect>
                    <rect fill="#4ade80" fillOpacity="0.1" height="8" rx="2" stroke="#4ade80" strokeWidth="2" width="28" x="58" y="32"></rect>
                    <rect fill="#00f2fe" fillOpacity="0.1" height="158" rx="2" stroke="#00f2fe" strokeWidth="2.5" width="28" x="58" y="42"></rect>
                  </g>
                  <g className="glow-cyan">
                    <rect fill="#4ade80" fillOpacity="0.1" height="14" rx="2" stroke="#4ade80" strokeWidth="2" width="28" x="122" y="24"></rect>
                    <rect fill="#131e33" height="52" rx="2" stroke="#22d3ee" strokeWidth="1.8" width="28" x="122" y="40"></rect>
                    <rect fill="#00f2fe" fillOpacity="0.1" height="106" rx="2" stroke="#00f2fe" strokeWidth="2.5" width="28" x="122" y="94"></rect>
                  </g>
                  <g className="glow-cyan">
                    <rect fill="#a3e635" fillOpacity="0.1" height="14" rx="2" stroke="#a3e635" strokeWidth="2" width="28" x="186" y="24"></rect>
                    <rect fill="#00f2fe" fillOpacity="0.1" height="160" rx="2" stroke="#00f2fe" strokeWidth="2.5" width="28" x="186" y="40"></rect>
                  </g>
                  <g className="glow-cyan">
                    <rect fill="#4ade80" fillOpacity="0.1" height="18" rx="2" stroke="#4ade80" strokeWidth="2" width="28" x="250" y="24"></rect>
                    <rect fill="#131e33" height="30" rx="2" stroke="#22d3ee" strokeWidth="1.8" width="28" x="250" y="44"></rect>
                    <rect fill="#00f2fe" fillOpacity="0.1" height="124" rx="2" stroke="#00f2fe" strokeWidth="2.5" width="28" x="250" y="76"></rect>
                  </g>
                  <g className="glow-cyan">
                    <rect fill="#a3e635" fillOpacity="0.1" height="66" rx="2" stroke="#a3e635" strokeWidth="2.5" width="28" x="314" y="24"></rect>
                    <rect fill="#131e33" height="50" rx="2" stroke="#22d3ee" strokeWidth="2" width="28" x="314" y="92"></rect>
                    <rect fill="#00f2fe" fillOpacity="0.1" height="56" rx="2" stroke="#00f2fe" strokeWidth="2.5" width="28" x="314" y="144"></rect>
                  </g>

                  <g fill="#94a3b8" fontFamily="sans-serif" fontSize="9">
                    <rect fill="#00f2fe" height="7" width="7" x="390" y="32"></rect>
                    <text x="403" y="39">{t.total}</text>
                    <rect fill="#22c55e" height="7" width="7" x="390" y="47"></rect>
                    <text x="403" y="54">{t.escalated}</text>
                    <rect fill="#a3e635" height="7" width="7" x="390" y="62"></rect>
                    <text x="403" y="69">{t.dismissed}</text>
                  </g>
                  <g fill="#94a3b8" fontFamily="sans-serif" fontSize="9">
                    <text transform="rotate(30, 65, 215)" x="65" y="215">Kirim</text>
                    <text transform="rotate(30, 127, 215)" x="127" y="215">Chiqim</text>
                    <text transform="rotate(30, 190, 215)" x="190" y="215">Karta</text>
                    <text transform="rotate(30, 252, 215)" x="252" y="215">Bank Otkazmasi</text>
                    <text transform="rotate(30, 306, 215)" x="306" y="215">Naqd / Xalqaro</text>
                  </g>
                </svg>
              </div>
            </div>
            <div className="md:col-span-5 glass-card rounded-2xl p-6 sm:p-7 flex flex-col justify-center">
              <h2 className="text-white text-lg font-medium mb-4 leading-snug">{t.typesByOutcome}</h2>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">{t.typesByOutcomeDesc1}</p>
              <p className="text-slate-400 text-sm leading-relaxed">{t.typesByOutcomeDesc2}</p>
            </div>
          </article>
        </div>

        {/* --- TARGET DISTRIBUTION (Required by Hackathon TZ) --- */}
        <div className="w-full mt-8 md:mt-10">
          <article className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch lg:col-span-2" data-purpose="chart-card-group">
            <div className="md:col-span-6 flex flex-col justify-end">
              <div className="relative w-full aspect-[2/1] sm:aspect-[16/9] rounded-xl border border-dashed border-cyan-500/20 bg-cyan-900/10 flex items-center justify-center">
                 <span className="text-cyan-500/40 font-mono text-sm">GRAPH: TARGET DISTRIBUTION</span>
              </div>
            </div>
            <div className="md:col-span-6 glass-card rounded-2xl p-6 sm:p-7 flex flex-col justify-center">
              <h2 className="text-white text-lg font-medium mb-4 leading-snug">{t.targetDistTitle}</h2>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                {t.targetDistDesc.replace("{rate}", data.rate)}
              </p>
            </div>
          </article>
        </div>
      </section>

      {/* --- ABLATION TABLE SECTION --- */}
      <section className="relative z-10 w-full max-w-[1024px] min-h-[559px] bg-[#070b10] rounded-lg shadow-2xl overflow-hidden flex flex-col justify-between p-7 border border-slate-800/40 mt-8 mb-16">
        <div aria-hidden="true" className="prism-background"></div>
        <div aria-hidden="true" className="prism-facets"></div>

        <header className="relative z-10 flex flex-col items-center w-full">
          <h2 className="text-[32px] sm:text-[34px] font-normal tracking-wide text-white text-center mb-5">{t.ablationTitle}</h2>
          <aside className="w-full max-w-[850px] bg-[#0e161c]/80 backdrop-blur-md border border-[#4ade80]/90 rounded-xl px-5 py-3 shadow-[0_0_15px_rgba(74,222,128,0.15)] flex items-start gap-3.5">
            <span aria-hidden="true" className="text-[#4ade80] text-2xl font-serif font-black leading-none mt-0.5 select-none">“</span>
            <p className="text-[13.5px] leading-[1.4] text-slate-200 font-normal">
              {t.ablationDesc.replace('{rejected}', data.rejected_families.toString()).replace('{chance}', data.chance_families.toString()).replace('{drift}', data.drift_verdict).replace('{adv}', data.adversarial.toString())}
            </p>
          </aside>
        </header>

        <div className="relative z-10 w-full flex justify-center pb-2 mt-8">
          <div className="w-full bg-[#0c1219]/75 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="table-row-border text-slate-300 font-medium text-[13px]">
                  <th className="pb-2.5 pl-4 font-normal text-slate-300 w-[44%]" scope="col">{t.familyAdded}</th>
                  <th className="pb-2.5 text-center font-normal text-slate-300 w-[16%]" scope="col">{t.columns}</th>
                  <th className="pb-2.5 text-center font-normal text-slate-300 w-[20%]" scope="col">
                    <span className="inline-flex items-center gap-2"><span className="text-white/20 text-xs">|</span> CV mean <span className="text-white/20 text-xs">|</span></span>
                  </th>
                  <th className="pb-2.5 pr-4 text-center font-normal text-slate-300 w-[20%]" scope="col">{t.decision}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-[13px] font-normal tracking-tight text-slate-300">
                {data.selection_history.map((row, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-1.5 pl-4 text-slate-200">{row.family}</td>
                    <td className="py-1.5 text-center font-mono text-slate-300">{row.n_columns}</td>
                    <td className="py-1.5 text-center font-mono text-slate-300">{row.mean.toFixed(4)}</td>
                    <td className="py-1.5 pr-4 text-center">
                      <span className={`inline-block min-w-[62px] text-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                        row.accepted 
                          ? "bg-[#34d399] text-[#042f1a] shadow-[0_0_10px_rgba(52,211,153,0.35)]" 
                          : "bg-[#ef4444] text-white shadow-[0_0_8px_rgba(239,68,68,0.35)]"
                      }`}>
                        {row.accepted ? t.kept : t.rejected}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* --- CONCLUSION (Required by Hackathon TZ) --- */}
      <section className="relative z-10 w-full max-w-[1024px] mb-16">
        <div className="w-full glass-card rounded-2xl p-6 sm:p-8 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
          <h2 className="text-2xl text-white font-medium mb-4 flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[#22f396] neon-dot-pulse"></span>{t.conclusionTitle}</h2>
          <div className="space-y-4 text-slate-300 text-[14.5px] leading-relaxed">
            <p>
              {t.conclusion1} 
            </p>
            <p>{t.conclusion2}</p>
          </div>
        </div>
      </section>

      {/* --- FOOTER / TEAM SECTION --- */}
      <footer className="relative z-10 w-full max-w-[1024px] mb-8 mt-auto flex flex-col items-center justify-center border-t border-cyan-900/30 pt-8 pb-4">
        <div className="flex items-center gap-4 mb-3">
          <div className="w-10 h-10 rounded-full border border-cyan-500/30 bg-cyan-950/40 flex items-center justify-center neon-logo-glow">
            <span className="font-mono text-cyan-400 font-bold">D</span>
          </div>
          <div>
            <h3 className="text-white font-medium text-lg tracking-wide">{t.teamInfo}</h3>
            <p className="text-cyan-500/70 text-xs font-mono tracking-widest uppercase">ID: 2ABB3C78</p>
          </div>
        </div>
        <p className="text-slate-600 text-xs mt-2 font-mono">
          WIUT Hackathon 2026 · FinTech / AI in Finance
        </p>
      </footer>

    </div>
  );
}

function App() {
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
      {/* --- SCROLL-BOUND VIDEO SEQUENCE --- */}
      <CanvasSequence 
        frameCount={240} 
        getFrameUrl={(index: number) => `${import.meta.env.BASE_URL}video-frames/frame_${index}.webp`} 
      />
      <EdaSection />
    </LanguageContext.Provider>
  );
}


export default App;
