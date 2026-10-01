const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

const usdaDataLogic = `
const USDA_RD_INCOME_LIMITS = {
    // Oregon
    'MULTNOMAH': { '1-4': 135500, '5-8': 178850 },
    'WASHINGTON': { '1-4': 135500, '5-8': 178850 },
    'CLACKAMAS': { '1-4': 135500, '5-8': 178850 },
    'YAMHILL': { '1-4': 135500, '5-8': 178850 },
    'COLUMBIA': { '1-4': 135500, '5-8': 178850 },
    'BENTON': { '1-4': 125150, '5-8': 165200 },
    'DESCHUTES': { '1-4': 120550, '5-8': 159150 },
    // Washington
    'KING': { '1-4': 173550, '5-8': 229100 },
    'SNOHOMISH': { '1-4': 173550, '5-8': 229100 },
    'PIERCE': { '1-4': 173550, '5-8': 229100 },
    'CLARK': { '1-4': 135500, '5-8': 178850 }
};

function getUsdaCountyLimit(county, size) {
    let c = String(county || '').toUpperCase().replace(/\\s+COUNTY/g, '').trim();
    if (USDA_RD_INCOME_LIMITS[c] && USDA_RD_INCOME_LIMITS[c][size]) {
        return USDA_RD_INCOME_LIMITS[c][size];
    }
    // Default baseline for most counties
    return size === '5-8' ? 148450 : 112450;
}

function usdaListingPasses(listing) {
    if (!listing?.overlayEligibility?.usda) return false;
    
    const slider = document.getElementById('usdaBorrowerIncome');
    if (!slider) return true;
    
    const borrowerIncome = Number(slider.value);
    if (borrowerIncome <= 0) return true; // Filter disabled
    
    const sizeSelect = document.getElementById('usdaHouseholdSize');
    const size = sizeSelect ? sizeSelect.value : '1-4';
    
    const limit = getUsdaCountyLimit(listing.county, size);
    return borrowerIncome <= limit;
}

function syncUsdaRdControls() {
    const controls = document.getElementById('usdaRdControls');
    if (!controls) return;
    const overlay = document.getElementById('savedOverlaySelect')?.value;
    const selected = overlay === 'usda' || overlay === 'lmiUsda';
    controls.classList.toggle('hidden', !selected);
}
`;

html = html.replace('function syncLakeviewPriceCapControls(pull = null) {', usdaDataLogic + '\nfunction syncLakeviewPriceCapControls(pull = null) {');

const renderSelectedAnchor = "syncLakeviewPriceCapControls(pull);";
html = html.replace(renderSelectedAnchor, renderSelectedAnchor + '\n        syncUsdaRdControls();');

const firstHomePassesAnchor = `if (program.id === 'firstHome') return (pull?.overlaySets?.all || []).filter(firstHomeListingPasses);`;
const usdaPassesInjection = `        if (overlay === 'usda') return (pull?.overlaySets?.all || []).filter(usdaListingPasses);
        if (overlay === 'lmiUsda') return (pull?.overlaySets?.all || []).filter(l => l?.overlayEligibility?.lmi && usdaListingPasses(l));`;

html = html.replace(firstHomePassesAnchor, firstHomePassesAnchor + '\n' + usdaPassesInjection);


fs.writeFileSync('index.html', html);
