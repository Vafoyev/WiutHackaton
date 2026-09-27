const fs = require('fs');

let content = fs.readFileSync('eda-website/src/App.tsx', 'utf8');

const heroTarget = `      <main className="relative z-10 max-w-3xl my-auto py-12 md:py-16">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full border border-[#22f396]/60 bg-[#22f396]/10 neon-pill-glow mb-8">
          <span className="w-2 h-2 rounded-full bg-[#22f396] neon-dot-pulse"></span>
          <span className="font-mono text-[11px] sm:text-xs tracking-wider text-[#22f396] font-medium uppercase">
            SYSTEM: OVERFITTING_PROTECTION_ACTIVE
          </span>
        </div>
        
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.08] mb-7">
          <span className="block text-white">{t.heroTitle1}</span>
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#22f396] via-[#0df2c9] to-[#22f396] neon-text-glow mt-1.5">
            Идеальный сигнал.
          </span>
        </h1>
        
        <p className="max-w-2xl text-sm sm:text-base md:text-[17px] text-[#788e9f] leading-relaxed font-normal">
          Мы построили систему приоритизации AML-алертов, основанную на строгой математике, доказательном отборе признаков и защите от переобучения.
        </p>
      </main>`;

const heroReplacement = `      <main className="relative z-10 max-w-4xl my-auto py-12 md:py-16">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center mb-6">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full border border-[#22f396]/60 bg-[#22f396]/10 neon-pill-glow">
            <span className="w-2 h-2 rounded-full bg-[#22f396] neon-dot-pulse"></span>
            <span className="font-mono text-[11px] sm:text-xs tracking-wider text-[#22f396] font-medium uppercase">
              FinTech / AI in Finance
            </span>
          </div>
          <div className="glass-card px-4 py-1.5 rounded-full inline-flex items-center">
            <span className="font-mono text-[13px] sm:text-sm text-cyan-400 font-semibold uppercase tracking-widest">
              AML Alert Prioritization
            </span>
          </div>
        </div>
        
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.08] mb-7">
          <span className="block text-white">{t.heroTitle1}</span>
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#22f396] via-[#0df2c9] to-[#22f396] neon-text-glow mt-1.5">
            {t.heroTitle2}
          </span>
        </h1>
        
        <p className="max-w-2xl text-sm sm:text-base md:text-[17px] text-[#788e9f] leading-relaxed font-normal">
          {t.heroDesc}
        </p>
      </main>`;

content = content.replace(heroTarget.replace(/\r\n/g, '\n'), heroReplacement);
content = content.replace(heroTarget, heroReplacement); // in case already CRLF

const tableTarget = `<div className="w-full max-w-[725px] bg-[#0c1219]/75 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">`;
const tableReplacement = `<div className="w-full bg-[#0c1219]/75 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">`;
content = content.replace(tableTarget, tableReplacement);

const conclusionTarget = `          <h2 className="text-2xl text-white font-medium mb-4 flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[#22f396] neon-dot-pulse"></span>
            Заключение и основные выводы
          </h2>
          <div className="space-y-4 text-slate-300 text-[14.5px] leading-relaxed">
            <p>
              В ходе разведочного анализа данных мы выявили, что базовые признаки (тип и направление транзакций) несут наиболее сильный сигнал, в то время как временные "окна" (windows) и сложные агрегации создают много шума и ведут к переобучению на исторических данных. 
            </p>
            <p>
              Эскалированные алерты характеризуются резким всплеском специфических транзакций в дни, непосредственно предшествующие срабатыванию системы. На основе этих инсайтов мы провели строгий отбор признаков, отсекли шумовые переменные и построили робастный ансамбль моделей. Это позволило нам не только повысить ROC-AUC на кросс-валидации, но и гарантировать устойчивость модели на скрытой тестовой выборке.
            </p>
          </div>`;

const conclusionReplacement = `          <h2 className="text-2xl text-white font-medium mb-4 flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[#22f396] neon-dot-pulse"></span>
            {t.conclusionTitle}
          </h2>
          <div className="space-y-4 text-slate-300 text-[14.5px] leading-relaxed">
            <p>
              {t.conclusion1}
            </p>
            <p>
              {t.conclusion2}
            </p>
          </div>`;

content = content.replace(conclusionTarget.replace(/\r\n/g, '\n'), conclusionReplacement);
content = content.replace(conclusionTarget, conclusionReplacement);

fs.writeFileSync('eda-website/src/App.tsx', content, 'utf8');
console.log('Fixed texts and table width');
