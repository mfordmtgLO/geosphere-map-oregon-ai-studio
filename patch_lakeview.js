const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// 1. Add the Lakeview National toggle to the sidebar
const toggleHTML = `
                <div class="border-t border-slate-800 pt-2 mt-2">
                    <span class="text-xs text-slate-500 font-medium uppercase tracking-wider">Lakeview National Overlay</span>
                </div>
                <label class="flex items-center space-x-3 cursor-pointer group">
                    <input type="checkbox" id="toggleLakeview" class="rounded border-slate-800 bg-slate-950 text-sky-500 h-4 w-4">
                    <span class="text-sm text-slate-300 group-hover:text-slate-100">🌊 Lakeview National (≤140% AMI)</span>
                </label>
                <div id="lakeviewLoadingStatus" class="hidden text-xs text-sky-400 mt-1 pl-6">
                    Loading Lakeview data...
                </div>
                <div id="lakeviewLegend" class="hidden pl-6 space-y-1 mt-2 mb-2">
                    <div class="flex items-center space-x-2">
                        <span class="w-3 h-3 rounded-sm bg-sky-500 inline-block opacity-40 border border-sky-600"></span>
                        <span class="text-xs text-slate-400">Eligible (≤140% Fannie County AMI)</span>
                    </div>
                </div>`;

html = html.replace('<!-- LMI Overlay -->', '<!-- LMI Overlay -->'); // fallback if I need to find the spot
if (!html.includes('id="toggleLakeview"')) {
    html = html.replace(/(<input type="checkbox" id="toggleUSDA"[^>]*>\s*<span[^>]*>.*?<\/span>\s*<\/label>\s*<div id="usdaLoadingStatus".*?<\/div>\s*<div id="usdaLegend".*?<\/div>\s*<\/div>\s*<\/div>)/s, '$1' + toggleHTML);
    // If not found, let's just insert it right after the USDA legend.
}

fs.writeFileSync('index_patched.html', html);
