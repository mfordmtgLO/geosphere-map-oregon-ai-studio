const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

const oldUsdaTag = `if (listing?.overlayEligibility?.usda) {`;
const newUsdaTag = `if (usdaListingPasses(listing)) {`;

html = html.replace(oldUsdaTag, newUsdaTag);

fs.writeFileSync('index.html', html);
