const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

const replacement = `const FANNIE_MAE_AMI_2026 = {
    'MULTNOMAH': 116200, 'WASHINGTON': 116200, 'CLACKAMAS': 116200, 'COLUMBIA': 116200, 'YAMHILL': 116200,
    'MARION': 93400, 'POLK': 93400, 'DESCHUTES': 104100, 'LANE': 90100, 'JACKSON': 85800,
    'BENTON': 109200, 'LINN': 86400, 'DOUGLAS': 73100, 'COOS': 71100, 'JOSEPHINE': 69400,
    'KLAMATH': 72500, 'UMATILLA': 77500, 'WASCO': 77600, 'CLATSOP': 81300, 'LINCOLN': 75500,
    'KING': 147400, 'SNOHOMISH': 147400, 'PIERCE': 147400, 'SPOKANE': 96300, 'CLARK': 116200, 'THURSTON': 103300
};

function lakeviewListingPasses(listing) {
    const screening = getEffectiveLakeviewScreening(listing);
    if (screening?.reviewReady !== true) return false;
    
    const slider = document.getElementById('lakeviewBorrowerIncome');
    if (!slider) return true;
    
    const borrowerIncome = Number(slider.value);
    if (borrowerIncome <= 0) return true; // Filter disabled
    
    // Check 140% AMI limit
    let county = String(listing.county || '').toUpperCase().replace(/\\s+COUNTY/g, '').trim();
    let countyAmi = FANNIE_MAE_AMI_2026[county] || 85000; // default 85k if missing
    let amiLimit = countyAmi * 1.4;
    
    return borrowerIncome <= amiLimit;
}`;

html = html.replace('function lakeviewListingPasses(listing) {\n    return getEffectiveLakeviewScreening(listing)?.reviewReady === true;\n}', replacement);

fs.writeFileSync('index.html', html);
