const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

const replacement = `document.querySelectorAll('[data-lakeview-price-cap]').forEach((slider) => slider.addEventListener('input', (event) => {
            const unitCount = Number(event.target.dataset.lakeviewPriceCap);
            saveLakeviewPriceCap(unitCount, Number(event.target.value));
            syncLakeviewPriceCapControls();
            renderSelectedSavedPull();
        }));
        
        const lakeviewIncomeSlider = document.getElementById('lakeviewBorrowerIncome');
        if (lakeviewIncomeSlider) {
            lakeviewIncomeSlider.addEventListener('input', (event) => {
                const val = Number(event.target.value);
                const out = document.getElementById('lakeviewBorrowerIncomeValue');
                if (out) out.textContent = val > 0 ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val) : 'Off';
                renderSelectedSavedPull();
            });
        }`;

html = html.replace(`document.querySelectorAll('[data-lakeview-price-cap]').forEach((slider) => slider.addEventListener('input', (event) => {
            const unitCount = Number(event.target.dataset.lakeviewPriceCap);
            saveLakeviewPriceCap(unitCount, Number(event.target.value));
            syncLakeviewPriceCapControls();
            renderSelectedSavedPull();
        }));`, replacement);

fs.writeFileSync('index.html', html);
