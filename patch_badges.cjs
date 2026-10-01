const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

const anchor = "const lakeviewOverlayActive = document.getElementById('savedOverlaySelect')?.value === 'lakeviewNational';";

const badgeLogic = `
                let topBadges = [];
                if (lakeviewListingPasses(listing)) {
                    topBadges.push('<span style="display:inline-block; border-radius:999px; background:#e0f2fe; color:#0369a1; border: 1px solid #bae6fd; padding:3px 7px; font-size:10px; font-weight:700; margin-right: 4px; margin-bottom: 4px;">🌊 Lakeview National</span>');
                }
                if (firstHome?.reviewReady) {
                    topBadges.push('<span style="display:inline-block; border-radius:999px; background:#dcfce7; color:#15803d; border: 1px solid #bbf7d0; padding:3px 7px; font-size:10px; font-weight:700; margin-right: 4px; margin-bottom: 4px;">🏠 OHCS FirstHome</span>');
                }
                if (listing?.overlayEligibility?.usda) {
                    topBadges.push('<span style="display:inline-block; border-radius:999px; background:#f0fdf4; color:#166534; border: 1px solid #bbf7d0; padding:3px 7px; font-size:10px; font-weight:700; margin-right: 4px; margin-bottom: 4px;">🚜 USDA RD Eligible</span>');
                }
                const topBadgesMarkup = topBadges.length > 0 ? \`<div style="margin-bottom: 8px; display: flex; flex-wrap: wrap;">\${topBadges.join('')}</div>\` : '';
`;

if (!html.includes('topBadgesMarkup')) {
    html = html.replace(anchor, anchor + '\n' + badgeLogic);
}

// Now insert `topBadgesMarkup` into the bindPopup string
const popupAnchor = `<div class="text-sm font-sans" style="min-width: 270px; max-width: 320px; color: #1e293b;">`;
if (!html.includes('${topBadgesMarkup}')) {
    html = html.replace(popupAnchor, popupAnchor + '\n                            ${topBadgesMarkup}');
}

// Remove the static "Lakeview: Yes" from the lakeviewMarkup that I previously added incorrectly
const lakeviewMarkupAnchor = `<span style="display:inline-block; border-radius:999px; background:#0ea5e9; color:#f0f9ff; padding:3px 7px; font-size:11px; font-weight:700; margin-left: 4px;">🌊 Lakeview: Yes (≤140% AMI)</span>`;
if (html.includes(lakeviewMarkupAnchor)) {
    html = html.replace(lakeviewMarkupAnchor, '');
}

fs.writeFileSync('index.html', html);
