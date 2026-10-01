const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

const incomeSliderHtml = `
                    <div class="border-t border-sky-900/50 pt-3 mt-3 pb-2 mb-3">
                        <div class="flex items-center justify-between gap-2 mb-1">
                            <label for="lakeviewBorrowerIncome" class="text-[10px] font-semibold text-sky-300 uppercase tracking-wider">Borrower Income Filter</label>
                            <output id="lakeviewBorrowerIncomeValue" class="text-[10px] font-mono font-semibold text-sky-300">Off</output>
                        </div>
                        <input id="lakeviewBorrowerIncome" type="range" min="0" max="350000" step="1000" value="0" class="w-full accent-sky-400">
                        <p class="text-[9px] leading-relaxed text-sky-200/80 mt-1">Set to 0 to disable. When set, properties are hidden if this income exceeds 140% of the county's Fannie Mae AMI.</p>
                    </div>`;

if (!html.includes('id="lakeviewBorrowerIncome"')) {
    html = html.replace('<div id="lakeviewLocalCapSliders"', incomeSliderHtml + '\n                    <div id="lakeviewLocalCapSliders"');
}

fs.writeFileSync('index.html', html);
