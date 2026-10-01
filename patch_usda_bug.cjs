const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const anchor = `	    function configuredProgramReviewListings(pull, overlay) {
	        const program = getLiveProgramReviewDefinition(overlay);
	        if (!program) return null;
	        if (program.id === 'firstHome') return (pull?.overlaySets?.all || []).filter(firstHomeListingPasses);
        if (overlay === 'usda') return (pull?.overlaySets?.all || []).filter(usdaListingPasses);
        if (overlay === 'lmiUsda') return (pull?.overlaySets?.all || []).filter(l => l?.overlayEligibility?.lmi && usdaListingPasses(l));`;

const injection = `	    function configuredProgramReviewListings(pull, overlay) {
        if (overlay === 'usda') return (pull?.overlaySets?.all || []).filter(usdaListingPasses);
        if (overlay === 'lmiUsda') return (pull?.overlaySets?.all || []).filter(l => l?.overlayEligibility?.lmi && usdaListingPasses(l));
	        const program = getLiveProgramReviewDefinition(overlay);
	        if (!program) return null;
	        if (program.id === 'firstHome') return (pull?.overlaySets?.all || []).filter(firstHomeListingPasses);`;

html = html.replace(anchor, injection);
fs.writeFileSync('index.html', html);
