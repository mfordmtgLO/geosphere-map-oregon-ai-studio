const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

const originalBlock = `        if (format === 'json') {
            const jsonOutput = allListingsToExport.map(item => {
                const copy = { ...item };
                delete copy._exportCityName;
                return copy;
            });
            downloadFile(JSON.stringify(jsonOutput, null, 2), 'saved_listings.json', 'application/json');
        } else {
            const headers = [
                'City', 'Address', 'State', 'Zip', 'Price', 'Property Type', 
                'SqFt', 'Bedrooms', 'Bathrooms', 'Status', 'Days on Market', 'MLS ID',
                'Agent Name', 'Agent Phone', 'Agent Email', 'Agent Website', 'Brokerage'
            ];
            let csvContent = headers.join(',') + '\\n';
            
            allListingsToExport.forEach(p => {
                const agent = p.listingAgent || {};
                
                let emailOut = agent.email || '';
                if (emailOut) {
                    emailOut = \`=HYPERLINK(""mailto:\${emailOut}"", ""\${emailOut}"")\`;
                }
                
                let websiteOut = agent.website || '';
                if (websiteOut) {
                    websiteOut = \`=HYPERLINK(""\${websiteOut}"", ""Agent Website"")\`;
                }

                const row = [
                    \`"\${(p.city || '').replace(/"/g, '""')}"\`,
                    \`"\${(p.addressLine1 || '').replace(/"/g, '""')}"\`,
                    \`"\${(p.state || '').replace(/"/g, '""')}"\`,
                    \`"\${(p.zipCode || '').replace(/"/g, '""')}"\`,
                    p.price ? p.price : '',
                    \`"\${(p.propertyType || '').replace(/"/g, '""')}"\`,
                    p.squareFootage || '',
                    p.bedrooms || '',
                    p.bathrooms || '',
                    \`"\${(p.status || '').replace(/"/g, '""')}"\`,
                    p.daysOnMarket || '',
                    \`"\${(p.id || '').replace(/"/g, '""')}"\`,
                    \`"\${(agent.name || '').replace(/"/g, '""')}"\`,
                    \`"\${(agent.phone || '').replace(/"/g, '""')}"\`,
                    \`"\${emailOut}"\`,
                    \`"\${websiteOut}"\`,
                    \`"\${(agent.brokerage || '').replace(/"/g, '""')}"\`
                ];
                csvContent += row.join(',') + '\\n';
            });
            
            downloadFile(csvContent, 'saved_listings.csv', 'text/csv');
        }`;

const newBlock = `        if (format === 'json') {
            const metadataLegend = {
                "Lakeview National": "Requires borrower income to be at or below 140% of the Fannie Mae Area Median Income (AMI) for the property's county.",
                "OHCS Flex Lending FirstHome": "Requires property to be in an FFIEC LMI tract and listed at or below the 2026 OHCS purchase price limit for the county.",
                "USDA RD Guaranteed": "Requires property to be located outside USDA designated ineligible urban areas, and borrower income within county limits for the specified household size."
            };

            const jsonOutput = {
                metadata: {
                    legend: metadataLegend,
                    disclaimer: "This is a screening aid only. A listing price does not establish loan amount, borrower qualification, or approval."
                },
                listings: allListingsToExport.map(item => {
                    const copy = { ...item };
                    delete copy._exportCityName;
                    copy.qualifiesFor = {
                        lakeviewNational: lakeviewListingPasses(copy),
                        ohcsFirstHome: firstHomeListingPasses(copy),
                        usdaRd: usdaListingPasses(copy)
                    };
                    return copy;
                })
            };
            downloadFile(JSON.stringify(jsonOutput, null, 2), 'saved_listings.json', 'application/json');
        } else {
            const headers = [
                'City', 'Address', 'State', 'Zip', 'Price', 'Property Type', 
                'SqFt', 'Bedrooms', 'Bathrooms', 'Status', 'Days on Market', 'MLS ID',
                'Lakeview National Eligible', 'OHCS FirstHome Eligible', 'USDA RD Eligible',
                'Agent Name', 'Agent Phone', 'Agent Email', 'Agent Website', 'Brokerage'
            ];
            
            let csvContent = "";
            csvContent += '"EXPORT METADATA & LEGEND"\\n';
            csvContent += '"Lakeview National","Requires borrower income to be at or below 140% of the Fannie Mae Area Median Income (AMI) for the county."\\n';
            csvContent += '"OHCS Flex Lending FirstHome","Requires property to be in an FFIEC LMI tract and listed at or below the 2026 OHCS purchase price limit for the county."\\n';
            csvContent += '"USDA RD Guaranteed","Requires property to be located outside USDA designated ineligible urban areas, and borrower income within county limits for the specified household size."\\n';
            csvContent += '"Disclaimer","This is a screening aid only. A listing price does not establish loan amount, borrower qualification, or approval."\\n\\n';

            csvContent += headers.join(',') + '\\n';
            
            allListingsToExport.forEach(p => {
                const agent = p.listingAgent || {};
                
                let emailOut = agent.email || '';
                if (emailOut) {
                    emailOut = \`=HYPERLINK(""mailto:\${emailOut}"", ""\${emailOut}"")\`;
                }
                
                let websiteOut = agent.website || '';
                if (websiteOut) {
                    websiteOut = \`=HYPERLINK(""\${websiteOut}"", ""Agent Website"")\`;
                }

                const row = [
                    \`"\${(p.city || '').replace(/"/g, '""')}"\`,
                    \`"\${(p.addressLine1 || '').replace(/"/g, '""')}"\`,
                    \`"\${(p.state || '').replace(/"/g, '""')}"\`,
                    \`"\${(p.zipCode || '').replace(/"/g, '""')}"\`,
                    p.price ? p.price : '',
                    \`"\${(p.propertyType || '').replace(/"/g, '""')}"\`,
                    p.squareFootage || '',
                    p.bedrooms || '',
                    p.bathrooms || '',
                    \`"\${(p.status || '').replace(/"/g, '""')}"\`,
                    p.daysOnMarket || '',
                    \`"\${(p.id || '').replace(/"/g, '""')}"\`,
                    \`"\${lakeviewListingPasses(p) ? 'Yes' : 'No'}"\`,
                    \`"\${firstHomeListingPasses(p) ? 'Yes' : 'No'}"\`,
                    \`"\${usdaListingPasses(p) ? 'Yes' : 'No'}"\`,
                    \`"\${(agent.name || '').replace(/"/g, '""')}"\`,
                    \`"\${(agent.phone || '').replace(/"/g, '""')}"\`,
                    \`"\${emailOut}"\`,
                    \`"\${websiteOut}"\`,
                    \`"\${(agent.brokerage || '').replace(/"/g, '""')}"\`
                ];
                csvContent += row.join(',') + '\\n';
            });
            
            downloadFile(csvContent, 'saved_listings.csv', 'text/csv');
        }`;

if (html.includes('if (format === \'json\') {')) {
    html = html.replace(originalBlock, newBlock);
    fs.writeFileSync('index.html', html);
    console.log("Patched successfully!");
} else {
    console.log("Could not find the original block to patch.");
}
