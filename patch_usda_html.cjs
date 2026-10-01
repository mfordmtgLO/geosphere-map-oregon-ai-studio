const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

const usdaHtml = `
                <div id="usdaRdControls" class="hidden rounded-xl border border-emerald-900/70 bg-emerald-950/30 p-3 space-y-3 mt-2">
                    <div class="flex items-center justify-between gap-2">
                        <span class="text-xs font-semibold uppercase tracking-wider text-emerald-300">USDA RD Income Limit</span>
                    </div>
                    <div class="space-y-1">
                        <label for="usdaHouseholdSize" class="text-[10px] text-emerald-200">Household Size</label>
                        <select id="usdaHouseholdSize" class="w-full rounded bg-slate-900 border border-emerald-800 text-xs text-emerald-100 p-1 outline-none">
                            <option value="1-4">1-4 Members</option>
                            <option value="5-8">5-8 Members</option>
                        </select>
                    </div>
                    <div class="border-t border-emerald-900/50 pt-3 mt-1 pb-2">
                        <div class="flex items-center justify-between gap-2 mb-1">
                            <label for="usdaBorrowerIncome" class="text-[10px] font-semibold text-emerald-300 uppercase tracking-wider">Household Income Filter</label>
                            <output id="usdaBorrowerIncomeValue" class="text-[10px] font-mono font-semibold text-emerald-300">Off</output>
                        </div>
                        <input id="usdaBorrowerIncome" type="range" min="0" max="250000" step="1000" value="0" class="w-full accent-emerald-400">
                        <p class="text-[9px] leading-relaxed text-emerald-200/80 mt-1">Set to 0 to disable. Excludes properties where income exceeds the county limit for the household size.</p>
                    </div>
                </div>`;

const anchor = `</div>\n                \n                <input type="text" id="searchInput"`;

if (!html.includes('id="usdaRdControls"')) {
    html = html.replace(anchor, '</div>\n' + usdaHtml + '\n                \n                <input type="text" id="searchInput"');
}

fs.writeFileSync('index.html', html);
