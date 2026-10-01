const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const anchor = `const lakeviewIncomeSlider = document.getElementById('lakeviewBorrowerIncome');`;
const injection = `
        const usdaIncomeSlider = document.getElementById('usdaBorrowerIncome');
        if (usdaIncomeSlider) {
            usdaIncomeSlider.addEventListener('input', (event) => {
                const val = Number(event.target.value);
                const out = document.getElementById('usdaBorrowerIncomeValue');
                if (out) out.textContent = val > 0 ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val) : 'Off';
                renderSelectedSavedPull();
            });
        }
        
        const usdaHouseholdSize = document.getElementById('usdaHouseholdSize');
        if (usdaHouseholdSize) {
            usdaHouseholdSize.addEventListener('change', () => {
                renderSelectedSavedPull();
            });
        }
`;

html = html.replace(anchor, injection + '\n        ' + anchor);
fs.writeFileSync('index.html', html);
