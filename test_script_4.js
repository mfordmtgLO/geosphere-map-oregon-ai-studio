
    // --- MOBILE VIEW STATE MANAGEMENT ---
    window.currentMobileView = "map";

    function switchMobileView(viewName) {
        window.currentMobileView = viewName;
        const sidebar = document.getElementById("sidebarPanel");
        const rightSection = document.getElementById("rightMainSection");
        const mapDiv = document.getElementById("map");
        const crmDrawer = document.getElementById("crmDrawer");
        const floatingFilterBtn = document.getElementById("mobileFloatingFilterBtn");
        
        const tabMap = document.getElementById("tabBtnMap");
        const tabControls = document.getElementById("tabBtnControls");
        const tabCrm = document.getElementById("tabBtnCrm");

        const inactiveTabClass = "flex flex-1 flex-col items-center justify-center py-1.5 px-2 rounded-xl text-slate-400 font-medium text-xs transition hover:text-slate-200";
        const activeTabClass = "flex flex-1 flex-col items-center justify-center py-1.5 px-2 rounded-xl text-indigo-400 font-semibold text-xs transition bg-slate-800/90 shadow-sm";

        [tabMap, tabControls, tabCrm].forEach(btn => {
            if (btn) btn.className = inactiveTabClass;
        });

        if (window.innerWidth < 768) {
            if (viewName === "map") {
                if (tabMap) tabMap.className = activeTabClass;
                if (sidebar) sidebar.classList.add("hidden");
                if (rightSection) rightSection.classList.remove("hidden");
                if (mapDiv) mapDiv.classList.remove("hidden");
                if (crmDrawer) {
                    crmDrawer.classList.add("hidden");
                    crmDrawer.classList.remove("flex-1", "h-full");
                }
                if (floatingFilterBtn) floatingFilterBtn.classList.remove("hidden");
                
                setTimeout(() => {
                    if (map) map.invalidateSize();
                }, 100);
            } else if (viewName === "controls") {
                if (tabControls) tabControls.className = activeTabClass;
                if (sidebar) sidebar.classList.remove("hidden");
                if (rightSection) rightSection.classList.add("hidden");
                if (floatingFilterBtn) floatingFilterBtn.classList.add("hidden");
            } else if (viewName === "crm") {
                if (tabCrm) tabCrm.className = activeTabClass;
                if (sidebar) sidebar.classList.add("hidden");
                if (rightSection) rightSection.classList.remove("hidden");
                if (mapDiv) mapDiv.classList.add("hidden");
                if (crmDrawer) {
                    crmDrawer.classList.remove("hidden");
                    crmDrawer.classList.add("flex-1", "h-full");
                }
                if (floatingFilterBtn) floatingFilterBtn.classList.add("hidden");
            }
        } else {
            // Restore standard desktop layout
            if (sidebar) sidebar.classList.remove("hidden");
            if (rightSection) rightSection.classList.remove("hidden");
            if (mapDiv) mapDiv.classList.remove("hidden");
            if (crmDrawer) {
                crmDrawer.classList.remove("hidden", "flex-1", "h-full");
            }
            if (floatingFilterBtn) floatingFilterBtn.classList.add("hidden");
            setTimeout(() => {
                if (map) map.invalidateSize();
            }, 100);
        }
    }

    window.addEventListener("resize", () => {
        switchMobileView(window.innerWidth < 768 ? window.currentMobileView : "desktop");
    });
    // --- 0. CONFIGURATION ---
    // API key stored in Vercel Environment Variables — never exposed to browser
    const MAX_PULLS = 50;
    
    // 🔧 TEST MODE: Set to true to test without using API pulls
    const TEST_MODE = false;
    
    // Persistent 30-day cache using localStorage
const CACHE_KEY_PREFIX = 'rentcast_cache_';
const CACHE_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function getCachedResults(cacheKey) {
    try {
        const raw = localStorage.getItem(CACHE_KEY_PREFIX + cacheKey);
        if (!raw) return null;
        const entry = JSON.parse(raw);
        if (Date.now() - entry.timestamp > CACHE_DURATION_MS) {
            localStorage.removeItem(CACHE_KEY_PREFIX + cacheKey);
            return null;
        }
        return entry.data;
    } catch (e) {
        return null;
    }
}

function setCachedResults(cacheKey, data) {
    try {
        const entry = {
            data: data,
            timestamp: Date.now()
        };
        localStorage.setItem(CACHE_KEY_PREFIX + cacheKey, JSON.stringify(entry));
    } catch (e) {
        // localStorage full — ignore
    }
}
    
    // --- 1. CLOUD-SYNCED API HARD STOP SYSTEM ---
    async function syncApiCounterFromBackend() {
        try {
            const res = await fetch('/api/rentcast?action=get_usage');
            if (res.ok) {
                const data = await res.json();
                if (typeof data.count === 'number') {
                    localStorage.setItem('rentcast_api_count', data.count.toString());
                    updateApiCounterUI();
                    return data.count;
                }
            }
        } catch (e) {
            console.warn('Could not sync usage from KV backend, using local:', e);
        }
        return getApiCount();
    }

    function getApiCount() {
        return parseInt(localStorage.getItem('rentcast_api_count') || '0');
    }
    
    function setApiCount(count) {
        localStorage.setItem('rentcast_api_count', count.toString());
        updateApiCounterUI();
    }
    
    function incrementApiCount(byAmount = 1) {
        const current = getApiCount();
        if (current >= MAX_PULLS) return false;
        setApiCount(current + byAmount);
        return true;
    }
    
    function isApiHardStopped() {
        return getApiCount() >= MAX_PULLS;
    }
        
    async function resetApiCounter() {
        if (confirm('Reset RentCast API counter to 0 on both server and browser?\n\nOnly do this when your billing cycle renews on the 6th.\n\nThis will also clear all cached search results.')) {
            setApiCount(0);
            try {
                await fetch('/api/rentcast?action=reset_usage', { method: 'POST' });
            } catch (e) {
                console.error('Failed to reset backend counter:', e);
            }
            // Clear all cached listing results in local storage
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith(CACHE_KEY_PREFIX)) {
                    localStorage.removeItem(key);
                }
            });
            alert('✅ API counter and cache reset. Pulls available: ' + MAX_PULLS);
        }
    }

    function updateApiCounterUI() {
        const count = getApiCount();
        const counterEl = document.getElementById("apiCounterColor");
        const progressBar = document.getElementById("apiProgressBar");
        const statusEl = document.getElementById("apiStatus");
        const hardStopWarning = document.getElementById("apiHardStopWarning");
        
        if (counterEl) counterEl.textContent = count;
        
        const percentage = Math.min((count / MAX_PULLS) * 100, 100);
        if (progressBar) progressBar.style.width = percentage + "%";
        
        if (count >= MAX_PULLS) {
            if (progressBar) progressBar.style.background = "#ef4444";
            if (counterEl) counterEl.style.color = "#ef4444";
            if (statusEl) {
                statusEl.textContent = "🚫 HARD STOP — 50/50 reached";
                statusEl.className = "text-xs text-red-400 text-center font-semibold";
            }
            if (hardStopWarning) hardStopWarning.classList.remove("hidden");
        } else if (count >= 40) {
            if (progressBar) progressBar.style.background = "#f59e0b";
            if (counterEl) counterEl.style.color = "#f59e0b";
            if (statusEl) {
                statusEl.textContent = "⚠️ Approaching limit — " + (MAX_PULLS - count) + " pulls remaining";
                statusEl.className = "text-xs text-amber-400 text-center";
            }
            if (hardStopWarning) hardStopWarning.classList.add("hidden");
        } else if (count >= 25) {
            if (progressBar) progressBar.style.background = "#facc15";
            if (counterEl) counterEl.style.color = "#facc15";
            if (statusEl) {
                statusEl.textContent = "Active — " + (MAX_PULLS - count) + " pulls remaining";
                statusEl.className = "text-xs text-slate-400 text-center";
            }
            if (hardStopWarning) hardStopWarning.classList.add("hidden");
        } else {
            if (progressBar) progressBar.style.background = "#22c55e";
            if (counterEl) counterEl.style.color = "#22c55e";
            if (statusEl) {
                statusEl.textContent = "Ready — " + (MAX_PULLS - count) + " pulls available";
                statusEl.className = "text-xs text-slate-400 text-center";
            }
            if (hardStopWarning) hardStopWarning.classList.add("hidden");
        }
    }

            // --- 2. OREGON LOCATION VALIDATION ---
        // --- 2. LOCATION VALIDATION ---
    function isValidLocation(query) {
        const q = query.toLowerCase().trim();
        if (!q) return false;
        
        const state = getSelectedState();
        
        // ZIP code validation per state
        const zipMatch = q.match(/\b(\d{5})\b/);
        if (zipMatch) {
            const zip = parseInt(zipMatch[1]);
            const zipRanges = {
                'OR': { min: 97000, max: 97999 },
                'WA': { min: 98000, max: 99499 },
                'CA': { min: 90000, max: 96199 },
                'ID': { min: 83200, max: 83899 }
            };
            const range = zipRanges[state];
            if (range && zip >= range.min && zip <= range.max) return true;
            return false;
        }
        
        return true;
    }
        
        
    
    
    // --- 3. LOCAL DATA MATRIX DECLARATIONS ---
    let map, geoJsonLayer, markerGroup;
    
    const appState = {
        leads: [
            { name: "Sarah Jenkins", email: "sarah@spatialtech.io", coords: "44.0521, -123.0867", tract: "41039002400", tasks: ["Webhook Fired", "Slack Dispatched"], status: "Synced" },
            { name: "Marcus Vance", email: "m.vance@urbananalytics.com", coords: "44.0612, -123.1001", tract: "41039002500", tasks: ["Webhook Fired"], status: "Pending Task" }
        ],
        mockGeoJsonData: {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": { "name": "Tract Alpha Corridor", "density": "High", "tractId": "41039002400" },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[
                            [-123.12, 44.04], [-123.06, 44.04], [-123.06, 44.07], [-123.12, 44.07], [-123.12, 44.04]
                        ]]
                    }
                }
            ]
        }
    };

    // --- 4. AUTOMATIC CORE LIFECYCLE HANDLERS ---
    document.addEventListener('DOMContentLoaded', () => {
        initializeMap();
        registerEventListeners();
        synchronizeCrmUi();
        updateApiCounterUI();
		syncApiCounterFromBackend();
        switchMobileView(window.innerWidth < 768 ? 'map' : 'desktop');
    });

    function initializeMap() {
        map = L.map('map', { zoomControl: false }).setView([44.0521, -123.0867], 13);
        L.control.zoom({ position: 'topright' }).addTo(map);

        const fullscreenControl = L.control({ position: 'topright' });
        const enterSvg = `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>`;
        const exitSvg = `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14h6m0 0v6m0-6L3 21m17-7h-6m0 0v6m0-6l7 7M10 10H4m6 0V4m0 6L3 3m10 7h6m-6 0V4m0 6l7-7"/></svg>`;

        function isCurrentlyFullscreen() {
            const mapContainer = document.getElementById('map');
            return Boolean(
                document.fullscreenElement ||
                document.webkitFullscreenElement ||
                document.mozFullScreenElement ||
                document.msFullscreenElement ||
                mapContainer?.classList.contains('map-inline-fullscreen')
            );
        }

        function setMapFullscreenState(fullscreen) {
            const mapContainer = document.getElementById('map');
            const button = document.querySelector('.map-fullscreen-button');
            if (!mapContainer) return;

            if (fullscreen) {
                mapContainer.classList.add('map-inline-fullscreen');
                document.body.classList.add('is-map-fullscreen');
                if (button) {
                    button.innerHTML = exitSvg;
                    button.title = 'Exit fullscreen map (Esc)';
                    button.setAttribute('aria-label', button.title);
                }
                const requestFs = mapContainer.requestFullscreen ||
                                  mapContainer.webkitRequestFullscreen ||
                                  mapContainer.mozRequestFullScreen ||
                                  mapContainer.msRequestFullscreen;
                if (requestFs && !document.fullscreenElement) {
                    try {
                        const promise = requestFs.call(mapContainer);
                        if (promise && typeof promise.catch === 'function') {
                            promise.catch(() => {});
                        }
                    } catch (e) {}
                }
            } else {
                mapContainer.classList.remove('map-inline-fullscreen');
                document.body.classList.remove('is-map-fullscreen');
                if (button) {
                    button.innerHTML = enterSvg;
                    button.title = 'Enter fullscreen map';
                    button.setAttribute('aria-label', button.title);
                }
                const exitFs = document.exitFullscreen ||
                               document.webkitExitFullscreen ||
                               document.mozCancelFullScreen ||
                               document.msExitFullscreen;
                if (exitFs && (document.fullscreenElement || document.webkitFullscreenElement)) {
                    try {
                        const promise = exitFs.call(document);
                        if (promise && typeof promise.catch === 'function') {
                            promise.catch(() => {});
                        }
                    } catch (e) {}
                }
            }

            if (map) {
                map.invalidateSize();
                setTimeout(() => map.invalidateSize(), 50);
                setTimeout(() => map.invalidateSize(), 200);
            }
        }

        fullscreenControl.onAdd = function() {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control-fullscreen');
            const button = L.DomUtil.create('a', 'map-fullscreen-button', container);
            button.href = '#';
            button.setAttribute('role', 'button');
            button.setAttribute('aria-label', 'Enter fullscreen map');
            button.title = 'Enter fullscreen map';
            button.innerHTML = enterSvg;
            L.DomEvent.disableClickPropagation(container);
            L.DomEvent.disableScrollPropagation(container);

            L.DomEvent.on(button, 'click', function(event) {
                L.DomEvent.preventDefault(event);
                L.DomEvent.stopPropagation(event);
                setMapFullscreenState(!isCurrentlyFullscreen());
            });
            return container;
        };
        fullscreenControl.addTo(map);

        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape' && isCurrentlyFullscreen()) {
                setMapFullscreenState(false);
            }
        });

        const onFsChange = function() {
            const hasFs = Boolean(
                document.fullscreenElement ||
                document.webkitFullscreenElement ||
                document.mozFullScreenElement ||
                document.msFullscreenElement
            );
            if (!hasFs && document.getElementById('map')?.classList.contains('map-inline-fullscreen')) {
                setMapFullscreenState(false);
            }
        };
        document.addEventListener('fullscreenchange', onFsChange);
        document.addEventListener('webkitfullscreenchange', onFsChange);
        document.addEventListener('mozfullscreenchange', onFsChange);
        document.addEventListener('MSFullscreenChange', onFsChange);

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(map);

        markerGroup = L.layerGroup().addTo(map);
        renderSpatialLayers();
    }

    // --- 5. GEOGRAPHIC COMPUTATION & RENDER ---
    function renderSpatialLayers() {
        if (geoJsonLayer) { map.removeLayer(geoJsonLayer); }
        if (!document.getElementById('toggleGeoJson').checked) return;

        geoJsonLayer = L.geoJSON(appState.mockGeoJsonData, {
            style: () => ({
                fillColor: '#6366f1',
                weight: 2,
                opacity: 0.8,
                color: '#4f46e5',
                fillOpacity: 0.15
            }),
            onEachFeature: (feature, layer) => {
                layer.bindPopup(
                    '<div class="p-2 bg-slate-900 text-slate-100 text-xs rounded font-sans">' +
                    '<strong class="text-indigo-400 block text-sm">' + feature.properties.name + '</strong>' +
                    '<div class="mt-1">Tract ID: <span class="font-mono text-amber-400">' + feature.properties.tractId + '</span></div>' +
                    '<div>Density Profile: ' + feature.properties.density + '</div>' +
                    '</div>'
                );
                layer.on('mouseover', () => layer.setStyle({ fillOpacity: 0.35, color: '#818cf8' }));
                layer.on('mouseout', () => layer.setStyle({ fillOpacity: 0.15, color: '#4f46e5' }));
            }
        }).addTo(map);
    }

    async function fetchCensusTractDataApi(lat, lng) {
        const trackOutputField = document.getElementById('formTract');
        trackOutputField.value = "Interrogating Census API...";

        if (!document.getElementById('toggleCensus').checked) {
            trackOutputField.value = "Census Mode Disabled";
            return "00000000000";
        }

        try {
            await new Promise(resolve => setTimeout(resolve, 800));
            const stateFips = document.getElementById('stateSelect').value;
            const mockTractId = stateFips + "03900" + Math.floor(2000 + Math.random() * 900);
            trackOutputField.value = mockTractId;
            return mockTractId;
        } catch (err) {
            console.error("Census API Exception: ", err);
            trackOutputField.value = "Traversal Failed";
            return "ERROR_ID";
        }
    }
            // --- 6. PROPERTY SEARCH (TEST MODE + LIVE MODE) ---
    async function performPropertySearch(query) {
        const tractField = document.getElementById('formTract');
        const searchError = document.getElementById('searchError');
        
               if (!isValidLocation(query)) {
            searchError.textContent = '⚠️ Please enter a valid address, city, or county.';
            searchError.classList.remove('hidden');
            return;
        }
        searchError.classList.add('hidden');
        
        const searchParams = parseSearchQuery(query);
        
        if (!searchParams) {
            searchError.textContent = '⚠️ Could not determine location. Try a city name, county, or ZIP code.';
            searchError.classList.remove('hidden');
            return;
        }
        
        tractField.value = "Searching listings...";
        
        try {
           const stateAbbr = getSelectedState();
const stateName = { 'OR': 'Oregon', 'WA': 'Washington', 'CA': 'California', 'ID': 'Idaho' }[stateAbbr] || 'Oregon';
const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', ' + stateName)}&limit=1`;
            const geocodeResponse = await fetch(geocodeUrl);
            const geocodeData = await geocodeResponse.json();
            
            let mapLat = 44.0521;
            let mapLng = -123.0867;
            let zoomLevel = 10;
            
            if (geocodeData && geocodeData.length > 0) {
                mapLat = parseFloat(geocodeData[0].lat);
                mapLng = parseFloat(geocodeData[0].lon);
                
                if (searchParams.zipCode) {
                    zoomLevel = 14;
                } else if (searchParams.city) {
                    zoomLevel = 11;
                } else if (searchParams.county) {
                    zoomLevel = 9;
                }
            }
            
            document.getElementById('formCoords').value = mapLat.toFixed(4) + ", " + mapLng.toFixed(4);
            map.setView([mapLat, mapLng], zoomLevel);
            
            markerGroup.clearLayers();
            L.marker([mapLat, mapLng]).addTo(markerGroup)
                .on('click', () => { window.highlightTractForMarker(mapLng, mapLat); })
                .bindPopup('<span class="text-xs font-mono text-slate-900">📍 ' + query + '</span>')
                .openPopup();
            
            if (window.searchCircle) {
                map.removeLayer(window.searchCircle);
                window.searchCircle = null;
            }
            
            await fetchCensusTractDataApi(mapLat, mapLng);
            
            if (TEST_MODE) {
                tractField.value = "3 listings (TEST MODE)";
                displayListingsOnMap([
                    { price: 425000, bedrooms: 3, bathrooms: 2, squareFootage: 1650, propertyType: "Single Family", formattedAddress: "123 Main St, " + query + ", OR", latitude: mapLat + 0.005, longitude: mapLng + 0.006 },
                    { price: 375000, bedrooms: 2, bathrooms: 1, squareFootage: 1100, propertyType: "Single Family", formattedAddress: "456 Oak Ave, " + query + ", OR", latitude: mapLat - 0.003, longitude: mapLng + 0.004 },
                    { price: 550000, bedrooms: 4, bathrooms: 3, squareFootage: 2200, propertyType: "Single Family", formattedAddress: "789 Pine Rd, " + query + ", OR", latitude: mapLat + 0.004, longitude: mapLng - 0.005 }
                ]);
                return;
            }
            
            await fetchPropertyListingsByLocation(searchParams);
            
        } catch (error) {
            console.error('Search Error:', error);
            tractField.value = "Search failed";
            searchError.textContent = '⚠️ Search failed. Please try again.';
            searchError.classList.remove('hidden');
        }
    }
               // --- OFFLINE SEARCH (cached listings only, no API calls) ---
    async function performOfflineSearch(query) {
        const tractField = document.getElementById('formTract');
        const searchError = document.getElementById('searchError');
        
        if (!isValidLocation(query)) {
            searchError.textContent = '⚠️ Please enter a valid location.';
            searchError.classList.remove('hidden');
            return;
        }
        searchError.classList.add('hidden');
        
        const searchParams = parseSearchQuery(query);
        if (!searchParams) {
            searchError.textContent = '⚠️ Could not determine location.';
            searchError.classList.remove('hidden');
            return;
        }
        
        // Geocode and move map FIRST — always navigate
        const stateAbbr = getSelectedState();
        const stateNameMap = { 'OR': 'Oregon', 'WA': 'Washington', 'CA': 'California', 'ID': 'Idaho' };
        const stateName = stateNameMap[stateAbbr] || 'Oregon';
        
        try {
            const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', ' + stateName)}&limit=1`;
            const geocodeResponse = await fetch(geocodeUrl);
            const geocodeData = await geocodeResponse.json();
            
            if (geocodeData && geocodeData.length > 0) {
                const mapLat = parseFloat(geocodeData[0].lat);
                const mapLng = parseFloat(geocodeData[0].lon);
                const displayName = geocodeData[0].display_name;
                
                document.getElementById('formCoords').value = mapLat.toFixed(4) + ", " + mapLng.toFixed(4);
                
                const zoomLevel = searchParams.zipCode ? 14 : searchParams.county ? 9 : 11;
                map.setView([mapLat, mapLng], zoomLevel);
                
                markerGroup.clearLayers();
                L.marker([mapLat, mapLng]).addTo(markerGroup)
                    .on('click', () => { window.highlightTractForMarker(mapLng, mapLat); })
                    .bindPopup('<span class="text-xs font-mono text-slate-900">📍 ' + displayName + '</span>')
                    .openPopup();
            }
        } catch (e) {
            console.warn('Geocoding failed:', e.message);
        }
        
        // Now check cache for listings
        const cacheKey = (searchParams.city || '') + '|' + (searchParams.county || '') + '|' + (searchParams.zipCode || '') + '|' + (searchParams.state || '');
        const cached = getCachedResults(cacheKey);
        
        if (cached) {
            tractField.value = cached.count + " listings (saved)";
            displayListingsOnMap(cached.listings);
        } else {
            tractField.value = "Location pinned — no saved listings";
            // Show a subtle info instead of blocking error
            searchError.textContent = '💡 No saved listings yet. Switch to Live Pull to fetch active listings.';
            searchError.classList.remove('hidden');
            // Auto-hide after 5 seconds
            setTimeout(() => {
                if (searchError.textContent.includes('No saved listings')) {
                    searchError.classList.add('hidden');
                }
            }, 5000);
        }
    }
            function getSelectedState() {
        const stateSelect = document.getElementById('stateSelect');
        const stateFips = stateSelect ? stateSelect.value : '41';
        const stateMap = {
            '41': 'OR',
            '53': 'WA',
            '06': 'CA',
            '16': 'ID'
        };
        return stateMap[stateFips] || 'OR';
    }
    
        function parseSearchQuery(query) {
        const q = query.toLowerCase().trim();
        
        const zipMatch = q.match(/\b(97\d{3})\b/);
        if (zipMatch) {
                        return { zipCode: zipMatch[1], state: getSelectedState() };
        }
        
        // Check for county names — but only if the query is JUST the county name
        // or contains "county" to avoid false matches like "Coos Bay" matching "Coos"
        const counties = {
            'multnomah county': 'Multnomah', 'washington county': 'Washington', 
            'clackamas county': 'Clackamas', 'lane county': 'Lane', 
            'marion county': 'Marion', 'jackson county': 'Jackson', 
            'deschutes county': 'Deschutes', 'linn county': 'Linn', 
            'yamhill county': 'Yamhill', 'benton county': 'Benton', 
            'josephine county': 'Josephine', 'douglas county': 'Douglas', 
            'polk county': 'Polk', 'coos county': 'Coos', 
            'columbia county': 'Columbia', 'umatilla county': 'Umatilla', 
            'klamath county': 'Klamath', 'lincoln county': 'Lincoln',
            'malheur county': 'Malheur', 'clatsop county': 'Clatsop', 
            'union county': 'Union', 'tillamook county': 'Tillamook',
            'wasco county': 'Wasco', 'hood river county': 'Hood River', 
            'crook county': 'Crook', 'jefferson county': 'Jefferson',
            'baker county': 'Baker', 'curry county': 'Curry', 
            'morrow county': 'Morrow', 'wallowa county': 'Wallowa',
            'harney county': 'Harney', 'lake county': 'Lake', 
            'grant county': 'Grant', 'sherman county': 'Sherman',
            'gilliam county': 'Gilliam', 'wheeler county': 'Wheeler'
        };
        
        for (const [key, value] of Object.entries(counties)) {
            if (q.includes(key)) {
                               return { county: value, state: getSelectedState() };
            }
        }
        
        let cityName = q
            .replace(/,?\s*oregon/i, '')
            .replace(/,?\s*or\b/i, '')
            .replace(/^\d+\s+/, '')
            .replace(/,/g, '')
            .trim();
        
        cityName = cityName.replace(/\b\w/g, c => c.toUpperCase());
        
        if (cityName) {
                        return { city: cityName, state: getSelectedState() };
        }
        
        return null;
    }
                // --- 7. RENTCAST PROPERTY LISTINGS BY LOCATION (LIVE MODE) ---
    async function fetchPropertyListingsByLocation(searchParams) {
        const tractField = document.getElementById('formTract');
        
        const cacheKey = (searchParams.city || '') + '|' + (searchParams.county || '') + '|' + (searchParams.zipCode || '') + '|' + (searchParams.state || '');
        
        // Live Pull always refreshes Rentcast and replaces the area snapshot.
        // Saved Listings mode remains cache-only and never calls Rentcast.
        if (isApiHardStopped()) {
            tractField.value = "API LIMIT REACHED - 50/50";
            alert('🚫 RentCast API hard stop active. Monthly limit of 50 pulls reached.\n\nUse the "Reset Monthly Counter" button when your billing cycle renews.');
            return null;
        }
        
        try {
            const queryString = Object.entries(searchParams)
                .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
                .join('&') + `&_t=${Date.now()}`;
            
            tractField.value = "Searching listings...";
            const response = await fetch(`/api/rentcast?${queryString}`);
            
            if (!response.ok) {
                let errorMsg = `API Error: ${response.status}`;
                try {
                    const errData = await response.json();
                    if (errData.error) errorMsg = errData.error;
                } catch (e) {}
                throw new Error(errorMsg);
            }
            
            const data = await response.json();
            
            if (data && data.listings && data.listings.length > 0) {
                const allowed = incrementApiCount();
                if (!allowed) {
                    tractField.value = "API LIMIT REACHED - 50/50";
                    return null;
                }
                
                const result = {
                    count: data.count,
                    listings: data.listings,
                    searchParams: searchParams
                };
                
                setCachedResults(cacheKey, result);
                
                const locationDesc = searchParams.city || searchParams.county || searchParams.zipCode || 'area';
                tractField.value = data.count + " active listings in " + locationDesc;
                
                displayListingsOnMap(data.listings);
                return result;
            } else {
                const locationDesc = searchParams.city || searchParams.county || searchParams.zipCode || 'this area';
                tractField.value = "No listings in " + locationDesc;
                return null;
            }
            
        } catch (error) {
            console.error('RentCast API Error:', error);
            tractField.value = "API Error: " + error.message.substring(0, 40);
            return null;
        }
    }
    
                // --- LMI CENSUS TRACT OVERLAY (FFIEC DATA) ---
    let lmiLayer;
    let lmiDataLoaded = false;
    
   
    
                                   async function loadLMIData() {
        const loadingStatus = document.getElementById('lmiLoadingStatus');
        const legend = document.getElementById('lmiLegend');
        
        loadingStatus.classList.remove('hidden');
        legend.classList.add('hidden');
        
        let attempts = 0;
        while ((typeof oregonTractGeoJSON === 'undefined' || typeof oregonLMITracts === 'undefined') && attempts < 20) {
            await new Promise(r => setTimeout(r, 250));
            attempts++;
        }
        
        if (typeof oregonTractGeoJSON !== 'undefined' && oregonTractGeoJSON.features 
            && typeof oregonLMITracts !== 'undefined') {
            renderLMITracts(oregonTractGeoJSON, oregonLMITracts);
            lmiDataLoaded = true;
            loadingStatus.classList.add('hidden');
            legend.classList.remove('hidden');
        } else {
            loadingStatus.textContent = 'LMI data not loaded. Check files.';
        }
    }
        
       
    
    window.lmiTractLayers = {};
    window.currentHighlightedTractGeoid = null;

    function renderLMITracts(geoJsonData, lmiMap) {
        if (lmiLayer) { map.removeLayer(lmiLayer); }
        window.lmiTractLayers = {};
        
        lmiLayer = L.geoJSON(geoJsonData, {
            style: (feature) => {
                const geoid = feature.properties.GEOID;
                const incomeLevel = lmiMap[geoid];
                
                if (incomeLevel === 'Low') {
                    return { fillColor: '#ef4444', weight: 1, opacity: 0.8, color: '#dc2626', fillOpacity: 0.35 };
                } else if (incomeLevel === 'Moderate') {
                    return { fillColor: '#f59e0b', weight: 1, opacity: 0.8, color: '#d97706', fillOpacity: 0.35 };
                }
                return { fillColor: 'transparent', weight: 0, opacity: 0, fillOpacity: 0 };
            },
            onEachFeature: (feature, layer) => {
                const geoid = feature.properties.GEOID;
                const incomeLevel = lmiMap[geoid];
                if (geoid) {
                    window.lmiTractLayers[geoid] = layer;
                }
                if (incomeLevel) {
                    const label = incomeLevel === 'Low' ? 'Low Income (<50% AMI)' : 'Moderate Income (50-79% AMI)';
                    layer.bindPopup(`
                        <div class="p-2 text-xs font-sans" style="color: #1e293b;">
                            <strong style="color: ${incomeLevel === 'Low' ? '#dc2626' : '#d97706'};">${label}</strong><br>
                            <span>Tract: <span style="font-family: monospace;">${geoid}</span></span><br>
                            <span style="color: #4f46e5;">🏠 OHCS Flex Lending Eligible</span>
                        </div>
                    `);
                }
            }
        }).addTo(map);
    }
    
    function toggleLMILayer(checked) {
        if (checked) {
            if (!lmiDataLoaded) {
                loadLMIData();
            } else if (lmiLayer) {
                lmiLayer.addTo(map);
            }
        } else {
            if (lmiLayer) { map.removeLayer(lmiLayer); }
        }
    }
        let usdaLayer;
let usdaDataLoaded = false;
let usdaLoadPromise;

async function loadUSDAData() {
    const legend = document.getElementById('usdaLegend');

    try {
        if (!usdaLoadPromise) {
            usdaLoadPromise = new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'usda-rural-development-geojson.js';
                script.async = true;
                script.onload = resolve;
                script.onerror = () => reject(new Error('The local USDA geographic data file could not be loaded.'));
                document.head.appendChild(script);
            });
        }

        await usdaLoadPromise;
        if (!window.usdaRuralDevelopmentGeojson || window.usdaRuralDevelopmentGeojson.type !== 'FeatureCollection') {
            throw new Error('The local USDA geographic data file has an invalid GeoJSON structure.');
        }

        usdaDataLoaded = true;
        renderUSDAAreas();
        legend.classList.remove('hidden');
    } catch (error) {
        console.error('USDA data load failed:', error);
        usdaLoadPromise = undefined;
    }
}

function renderUSDAAreas() {
    if (!map || !window.usdaRuralDevelopmentGeojson) return;
    if (usdaLayer) map.removeLayer(usdaLayer);

    const selectedStateFips = document.getElementById('stateSelect').value;
    usdaLayer = L.geoJSON(window.usdaRuralDevelopmentGeojson, {
        // Some source polygons cross state borders; displayStateFips preserves those verified map-view associations.
        filter: (feature) => (feature.properties?.displayStateFips || [feature.properties?.stateFips]).includes(selectedStateFips),
        style: () => ({
            fillColor: '#10b981',
            weight: 1.5,
            opacity: 0.9,
            color: '#059669',
            fillOpacity: 0.4
        }),
        onEachFeature: (feature, layer) => {
            const { state, stateFips, sourceObjectId, effectiveDate } = feature.properties || {};
            layer.bindPopup(`
                <div style="color:#1e293b; min-width: 180px;">
                    <strong style="color:#dc2626;">USDA RD ineligible urban area</strong><br>
                    State: <span style="font-family:monospace;">${state || stateFips || 'Unknown'}</span><br>
                    Feature: <span style="font-family:monospace;">${sourceObjectId ?? 'Unknown'}</span><br>
                    Effective: <span style="font-family:monospace;">${effectiveDate ? effectiveDate.slice(0, 10) : 'Unknown'}</span>
                </div>
            `);
            layer.on('mouseover', () => layer.setStyle({ fillOpacity: 0.55, color: '#047857' }));
            layer.on('mouseout', () => layer.setStyle({ fillOpacity: 0.4, color: '#059669' }));
        }
    }).addTo(map);
}

function toggleUSDALayer(checked) {
    if (checked) {
        if (!usdaDataLoaded) {
            loadUSDAData();
        } else {
            renderUSDAAreas();
        }
    } else if (usdaLayer) {
        map.removeLayer(usdaLayer);
    }
}

let lakeviewLayer = null;
let lakeviewDataLoaded = false;

function renderLakeviewTracts(geoJsonData) {
    if (lakeviewLayer) { map.removeLayer(lakeviewLayer); }
    
    lakeviewLayer = L.geoJSON(geoJsonData, {
        style: (feature) => {
            return { fillColor: '#0ea5e9', weight: 1, opacity: 0.8, color: '#0284c7', fillOpacity: 0.25 };
        },
        onEachFeature: (feature, layer) => {
            const geoid = feature.properties.GEOID;
            layer.bindPopup(`
                <div class="p-2 text-xs font-sans" style="color: #1e293b;">
                    <strong style="color: #0284c7;">Lakeview National Eligible Tract</strong><br>
                    <span>Tract: <span style="font-family: monospace;">${geoid}</span></span><br>
                    <span style="color: #475569;">Lakeview borrower limit applies: ≤140% of Fannie County AMI</span>
                </div>
            `);
        }
    }).addTo(map);
}

async function loadLakeviewData() {
    const loadingStatus = document.getElementById('lakeviewLoadingStatus');
    const legend = document.getElementById('lakeviewLegend');
    
    loadingStatus.classList.remove('hidden');
    legend.classList.add('hidden');
    
    let attempts = 0;
    while (typeof oregonTractGeoJSON === 'undefined' && attempts < 20) {
        await new Promise(r => setTimeout(r, 250));
        attempts++;
    }
    
    if (typeof oregonTractGeoJSON !== 'undefined' && oregonTractGeoJSON.features) {
        renderLakeviewTracts(oregonTractGeoJSON);
        lakeviewDataLoaded = true;
        loadingStatus.classList.add('hidden');
        legend.classList.remove('hidden');
    } else {
        loadingStatus.textContent = 'Data not loaded.';
        loadingStatus.classList.remove('hidden');
    }
}

function toggleLakeviewLayer(checked) {
    if (checked) {
        if (!lakeviewDataLoaded) {
            loadLakeviewData();
        } else if (lakeviewLayer) {
            lakeviewLayer.addTo(map);
        }
    } else {
        if (lakeviewLayer) { map.removeLayer(lakeviewLayer); }
    }
}

// --- OHCS FIRSTHOME PURCHASE-PRICE SCREEN (OFFICIAL LIMIT DATA + LOCAL REVIEW OVERRIDES) ---
let firstHomeLimitData = null;
const FIRST_HOME_OVERRIDE_STORAGE_KEY = 'geosphere-firsthome-limit-review-v1';

    function formatFirstHomeDollars(value) {
    return Number.isFinite(Number(value)) ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value)) : 'Not applicable';
}

function safeExternalHttpUrl(value) {
    try {
        const parsed = new URL(String(value || ''));
        return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : '';
    } catch {
        return '';
    }
}

function safePhoneHref(value) {
    const digits = String(value || '').replace(/\D/g, '');
    return digits ? `tel:${digits}` : '';
}

function safeMailHref(value) {
    const email = String(value || '').trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? `mailto:${email}` : '';
}

function renderFullRentcastRecord(listing) {
    const json = escapeHtml(JSON.stringify(listing, null, 2));
    return `<details style="margin-top: 8px; border-top: 1px solid #e2e8f0; padding-top: 8px;"><summary style="cursor:pointer; color:#334155; font-size:12px; font-weight:700;">Rentcast property record</summary><p style="margin:5px 0 0; color:#64748b; font-size:10px;">Full data returned with this saved listing, including available listing-agent fields.</p><pre style="max-height:220px; overflow:auto; margin:6px 0 0; padding:8px; white-space:pre-wrap; overflow-wrap:anywhere; border-radius:6px; background:#f8fafc; color:#334155; font-size:10px;">${json}</pre></details>`;
}

const LAKEVIEW_PRICE_CAP_STORAGE_KEY = 'geosphere-lakeview-oregon-unit-review-caps-v2';
const LAKEVIEW_DEFAULT_PRICE_CAPS = Object.freeze({ 1: 832750, 2: 1066250, 3: 1288800, 4: 1601750 });

function getLakeviewPriceCaps() {
    try {
        const saved = JSON.parse(localStorage.getItem(LAKEVIEW_PRICE_CAP_STORAGE_KEY) || '{}');
        return Object.fromEntries(Object.entries(LAKEVIEW_DEFAULT_PRICE_CAPS).map(([units, fallback]) => {
            const value = Number(saved?.[units]);
            return [units, Number.isFinite(value) && value >= 250000 ? value : fallback];
        }));
    } catch {
        return { ...LAKEVIEW_DEFAULT_PRICE_CAPS };
    }
}

function getLakeviewPriceCap(unitCount) {
    return getLakeviewPriceCaps()[unitCount] ?? LAKEVIEW_DEFAULT_PRICE_CAPS[1];
}

function saveLakeviewPriceCap(unitCount, value) {
    const next = getLakeviewPriceCaps();
    next[unitCount] = value;
    localStorage.setItem(LAKEVIEW_PRICE_CAP_STORAGE_KEY, JSON.stringify(next));
}

function getEffectiveLakeviewScreening(listing) {
    const screening = listing?.overlayEligibility?.lakeviewNational;
    if (!screening?.available) return screening || null;
    const unitCount = screening?.property?.unitCount;
    const isOregon = screening.state === 'OR';
    const priceCap = isOregon ? getLakeviewPriceCap(unitCount) : Number(screening.defaultListingPriceCap);
    const price = Number(listing?.price);
    const priceEligible = Number.isFinite(price) && price > 0 && price <= priceCap;
    return {
        ...screening,
        reviewReady: isOregon
            ? Boolean(String(listing?.formattedAddress || listing?.address || '').trim()) && Number.isFinite(Number(listing?.latitude)) && Number.isFinite(Number(listing?.longitude)) && priceEligible && screening?.property?.stickBuiltOneToFour === true
            : screening.reviewReady === true,
        priceCap,
        priceEligible,
        localReviewCap: isOregon && priceCap !== LAKEVIEW_DEFAULT_PRICE_CAPS[unitCount],
        reason: isOregon
            ? (priceEligible ? `Active Oregon ${unitCount}-unit stick-built sale listing is within the selected listing-price review cap.` : `Listed price is above the selected ${unitCount || 'property'}-unit listing-price review cap.`)
            : screening.reason,
    };
}

const FANNIE_MAE_AMI_2026 = {
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
    let county = String(listing.county || '').toUpperCase().replace(/\s+COUNTY/g, '').trim();
    let countyAmi = FANNIE_MAE_AMI_2026[county] || 85000; // default 85k if missing
    let amiLimit = countyAmi * 1.4;
    
    return borrowerIncome <= amiLimit;
}

function fhfaCountyLimitListingPasses(listing) {
    return listing?.overlayEligibility?.fhfaCountyLimit?.reviewReady === true;
}

function calhfaMyHomeListingPasses(listing) {
    return listing?.overlayEligibility?.calhfaMyHome?.reviewReady === true;
}

function idahoMrbTaxExemptListingPasses(listing) {
    return listing?.overlayEligibility?.idahoMrbTaxExempt?.reviewReady === true;
}


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
    let c = String(county || '').toUpperCase().replace(/\s+COUNTY/g, '').trim();
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

function syncLakeviewPriceCapControls(pull = null) {
    const controls = document.getElementById('lakeviewPriceCapControls');
    if (!controls) return;
    const selected = document.getElementById('savedOverlaySelect')?.value === 'lakeviewNational';
    controls.classList.toggle('hidden', !selected);
    const state = String(pull?.area?.state || '').trim().toUpperCase();
    const isWashington = state === 'WA';
    document.getElementById('lakeviewLocalCapSliders')?.classList.toggle('hidden', isWashington);
    document.getElementById('btnResetLakeviewPriceCap')?.classList.toggle('hidden', isWashington);
    const title = document.getElementById('lakeviewPriceCapTitle');
    const sourceNote = document.getElementById('lakeviewPriceCapSourceNote');
    if (title) title.textContent = isWashington ? 'Washington county review caps' : 'Oregon listing-price review caps';
    if (sourceNote) sourceNote.textContent = isWashington
        ? '2026 FHFA Washington county and unit values are applied automatically from the saved listing’s county. No generic statewide high-cost ceiling is used; confirm the current product matrix before operational use.'
        : '2026 FHFA/Fannie Oregon baselines. Adjust annually after official limits update; saved only in this browser. The property’s verified unit count selects its cap.';
    const caps = getLakeviewPriceCaps();
    Object.entries(caps).forEach(([units, priceCap]) => {
        const slider = document.querySelector(`[data-lakeview-price-cap="${units}"]`);
        const output = document.getElementById(`lakeviewPriceCapValue-${units}`);
        if (slider) slider.value = String(priceCap);
        if (output) output.textContent = formatFirstHomeDollars(priceCap);
    });
}

function getFirstHomeOverrides() {
    try { return JSON.parse(localStorage.getItem(FIRST_HOME_OVERRIDE_STORAGE_KEY) || '{}'); }
    catch { return {}; }
}

function saveFirstHomeOverrides(overrides) {
    localStorage.setItem(FIRST_HOME_OVERRIDE_STORAGE_KEY, JSON.stringify(overrides));
}

function getEffectiveFirstHomeScreening(listing) {
    const screening = listing?.overlayEligibility?.firstHome;
    if (!screening?.available) return screening || null;
    const override = getFirstHomeOverrides()?.[screening.county]?.[screening.areaType];
    const priceLimit = Number.isFinite(Number(override)) ? Number(override) : screening.priceLimit;
    const price = Number(listing.price);
    const priceEligible = Number.isFinite(price) && price > 0 && Number.isFinite(priceLimit) ? price <= priceLimit : null;
    return { ...screening, priceLimit, priceEligible, lmiEligible: listing?.overlayEligibility?.lmi === true && priceEligible === true, localOverride: Number.isFinite(Number(override)) };
}

function firstHomeListingPasses(listing) {
    return getEffectiveFirstHomeScreening(listing)?.lmiEligible === true;
}

function renderFirstHomeLimitControls() {
    const select = document.getElementById('firstHomeCountySelect');
    const controls = document.getElementById('firstHomeLimitControls');
    const reset = document.getElementById('btnResetFirstHomeOverrides');
    if (!firstHomeLimitData?.county_price_limits?.length || !select || !controls || !reset) return;
    const county = firstHomeLimitData.county_price_limits.find((item) => item.county === select.value) || firstHomeLimitData.county_price_limits[0];
    const overrides = getFirstHomeOverrides()[county.county] || {};
    const fields = [
        ['targeted', 'Targeted area maximum', county.targeted_price_limit_usd],
        ['non_targeted', 'Non-targeted maximum', county.non_targeted_price_limit_usd],
    ];
    controls.innerHTML = `<p class="text-[10px] leading-relaxed text-slate-500">${escapeHtml(county.targeted_area_details || 'No targeted-area detail supplied.')}</p>` + fields.map(([key, label, official]) => {
        if (official === null || !Number.isFinite(Number(official))) return `<div class="rounded-lg border border-slate-800 bg-slate-950/50 px-2.5 py-2 text-[11px] text-slate-500"><span class="font-semibold text-slate-400">${label}:</span> Not applicable in official source</div>`;
        const value = Number.isFinite(Number(overrides[key])) ? Number(overrides[key]) : Number(official);
        return `<label class="block rounded-lg border border-slate-800 bg-slate-950/50 px-2.5 py-2 text-[11px] text-slate-300"><span class="flex items-center justify-between gap-2"><span>${label}</span><strong id="firstHome-${key}-value" class="text-emerald-300">${formatFirstHomeDollars(value)}</strong></span><input data-firsthome-limit="${key}" type="range" min="250000" max="1250000" step="1000" value="${value}" class="mt-2 w-full accent-emerald-500"><span class="mt-1 block text-[10px] text-slate-500">Official: ${formatFirstHomeDollars(official)}</span></label>`;
    }).join('');
    controls.classList.remove('hidden');
    controls.querySelectorAll('[data-firsthome-limit]').forEach((input) => input.addEventListener('input', (event) => {
        const key = event.target.dataset.firsthomeLimit;
        const value = Number(event.target.value);
        const next = getFirstHomeOverrides();
        next[county.county] = { ...(next[county.county] || {}), [key]: value };
        saveFirstHomeOverrides(next);
        const valueNode = document.getElementById(`firstHome-${key}-value`);
        if (valueNode) valueNode.textContent = formatFirstHomeDollars(value);
        renderSelectedSavedPull();
    }));
    reset.disabled = false;
}

async function loadFirstHomeLimits() {
    const status = document.getElementById('firstHomeStatus');
    const select = document.getElementById('firstHomeCountySelect');
    try {
        const response = await fetch('/oregon_firsthome_purchase_price_limits.json', { cache: 'no-store' });
        if (!response.ok) throw new Error(`FirstHome limits request failed (${response.status})`);
        firstHomeLimitData = await response.json();
        const counties = Array.isArray(firstHomeLimitData?.county_price_limits) ? firstHomeLimitData.county_price_limits : [];
        if (!counties.length) throw new Error('No county limits were supplied.');
        select.innerHTML = counties.map((item) => `<option value="${escapeHtml(item.county)}">${escapeHtml(item.county)} County</option>`).join('');
        select.disabled = false;
        status.textContent = `Official limits loaded · ${counties.length} counties`;
        status.className = 'text-[10px] font-semibold text-emerald-300';
        renderFirstHomeLimitControls();
    } catch (error) {
        console.error('FirstHome limit load failed:', error);
        status.textContent = 'FirstHome limits unavailable';
        status.className = 'text-[10px] font-semibold text-rose-300';
    }
}

    // --- 7.5 HIGHLIGHT TRACT PIP LOGIC ---
    function pointInRing(point, ring) {
        let inside = false;
        const lng = point[0];
        const lat = point[1];
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
            const xi = ring[i][0];
            const yi = ring[i][1];
            const xj = ring[j][0];
            const yj = ring[j][1];
            const crossesLatitude = (yi > lat) !== (yj > lat);
            const intersectLng = ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
            if (crossesLatitude && lng < intersectLng) inside = !inside;
        }
        return inside;
    }

    function pointInPolygon(point, rings) {
        if (!rings || !rings.length || !pointInRing(point, rings[0])) return false;
        return !rings.slice(1).some((hole) => pointInRing(point, hole));
    }

    function pointInGeometry(point, geometry) {
        if (!geometry) return false;
        if (geometry.type === "Polygon") return pointInPolygon(point, geometry.coordinates);
        if (geometry.type === "MultiPolygon") {
            return geometry.coordinates.some((polygon) => pointInPolygon(point, polygon));
        }
        return false;
    }

    function findTractForPoint(lng, lat) {
        if (typeof oregonTractGeoJSON === 'undefined' || !oregonTractGeoJSON.features) return null;
        const point = [lng, lat];
        for (const feature of oregonTractGeoJSON.features) {
            if (pointInGeometry(point, feature.geometry)) {
                return feature.properties.GEOID;
            }
        }
        return null;
    }

    window.highlightTractForMarker = function(lng, lat) {
        // Reset previous highlight
        if (window.currentHighlightedTractGeoid && window.lmiTractLayers[window.currentHighlightedTractGeoid]) {
            if (lmiLayer) {
                lmiLayer.resetStyle(window.lmiTractLayers[window.currentHighlightedTractGeoid]);
            }
        }
        
        const geoid = findTractForPoint(lng, lat);
        
        // Auto-enable LMI overlay if not active to ensure the tract can be highlighted
        const lmiToggle = document.getElementById('toggleLMI');
        if (lmiToggle && !lmiToggle.checked) {
            lmiToggle.checked = true;
            toggleLMILayer(true);
            
            // Poll for the layer to render if it was just loaded
            let attempts = 0;
            const checkLayer = setInterval(() => {
                if (geoid && window.lmiTractLayers && window.lmiTractLayers[geoid]) {
                    clearInterval(checkLayer);
                    const layer = window.lmiTractLayers[geoid];
                    layer.setStyle({ weight: 4, color: '#3b82f6', opacity: 1 });
                    layer.bringToFront();
                    window.currentHighlightedTractGeoid = geoid;
                }
                if (++attempts > 20) clearInterval(checkLayer);
            }, 250);
            return;
        }

        if (geoid && window.lmiTractLayers && window.lmiTractLayers[geoid]) {
            const layer = window.lmiTractLayers[geoid];
            layer.setStyle({
                weight: 4,
                color: '#3b82f6', // bold blue border
                opacity: 1
            });
            layer.bringToFront();
            window.currentHighlightedTractGeoid = geoid;
        } else {
            window.currentHighlightedTractGeoid = null;
        }
    };

        // --- 8. DISPLAY LISTINGS ON MAP ---
    function displayListingsOnMap(listings) {
        if (window.listingMarkers) {
            map.removeLayer(window.listingMarkers);
        }
        window.listingMarkers = L.layerGroup().addTo(map);
        
        listings.forEach(listing => {
            if (listing.latitude && listing.longitude) {
                const price = listing.price 
                    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(listing.price)
                    : 'N/A';
                
                const beds = listing.bedrooms || '?';
                const baths = listing.bathrooms || '?';
                const sqft = listing.squareFootage ? listing.squareFootage.toLocaleString() + ' sqft' : '';
                const address = listing.formattedAddress || listing.address || 'Address unavailable';
                const propType = listing.propertyType || 'Residential';
                const yearBuilt = listing.yearBuilt || 'N/A';
                const daysOnMarket = listing.daysOnMarket || 'N/A';
                const mls = listing.mlsNumber || '';
                const mlsName = listing.mlsName || '';
                const firstHome = getEffectiveFirstHomeScreening(listing);
                const lakeviewNational = getEffectiveLakeviewScreening(listing);
                const lakeviewReviewReady = lakeviewNational?.reviewReady === true;
                const lakeviewOverlayActive = document.getElementById('savedOverlaySelect')?.value === 'lakeviewNational';

                let topBadges = [];
                if (lakeviewListingPasses(listing)) {
                    topBadges.push('<span style="display:inline-block; border-radius:999px; background:#e0f2fe; color:#0369a1; border: 1px solid #bae6fd; padding:3px 7px; font-size:10px; font-weight:700; margin-right: 4px; margin-bottom: 4px;">🌊 Lakeview National</span>');
                }
                if (firstHome?.reviewReady) {
                    topBadges.push('<span style="display:inline-block; border-radius:999px; background:#dcfce7; color:#15803d; border: 1px solid #bbf7d0; padding:3px 7px; font-size:10px; font-weight:700; margin-right: 4px; margin-bottom: 4px;">🏠 OHCS FirstHome</span>');
                }
                if (usdaListingPasses(listing)) {
                    topBadges.push('<span style="display:inline-block; border-radius:999px; background:#f0fdf4; color:#166534; border: 1px solid #bbf7d0; padding:3px 7px; font-size:10px; font-weight:700; margin-right: 4px; margin-bottom: 4px;">🚜 USDA RD Eligible</span>');
                }
                const topBadgesMarkup = topBadges.length > 0 ? `<div style="margin-bottom: 8px; display: flex; flex-wrap: wrap;">${topBadges.join('')}</div>` : '';

                const firstHomeMarkup = firstHome?.available
                    ? `<div style="margin-top: 8px; border-top: 1px solid #d1fae5; padding-top: 8px;"><span style="display:inline-block; border-radius:999px; background:${firstHome.lmiEligible ? '#dcfce7' : firstHome.priceEligible === false ? '#fee2e2' : '#fef3c7'}; color:${firstHome.lmiEligible ? '#166534' : firstHome.priceEligible === false ? '#b91c1c' : '#92400e'}; padding:3px 7px; font-size:11px; font-weight:700;">OHCS FirstHome ${firstHome.lmiEligible ? 'price screen met' : firstHome.priceEligible === false ? 'over purchase-price limit' : 'screening review needed'}</span><br><span style="color:#334155; font-size:12px; font-weight:600;">${firstHome.areaType === 'targeted' ? 'Targeted area' : 'Non-targeted area'} · limit ${formatFirstHomeDollars(firstHome.priceLimit)}${firstHome.localOverride ? ' (local review value)' : ''}</span><br><span style="color:#64748b; font-size:10px;">${firstHome.targetedAreaDetails || 'Confirm FirstHome area and program requirements with OHCS.'}</span></div>`
                    : `<div style="margin-top: 8px; border-top: 1px solid #e2e8f0; padding-top: 8px; color:#64748b; font-size:11px;">OHCS FirstHome limit: not applicable or unavailable for this saved listing’s county.</div>`;
                const lakeviewUnitLabel = lakeviewNational?.property?.unitCount ? `${lakeviewNational.property.unitCount}-unit` : 'property';
                const lakeviewMarkup = `<div style="margin-top: 8px; border-top: 1px solid #dbeafe; padding-top: 8px;"><span style="display:inline-block; border-radius:999px; background:${lakeviewReviewReady ? '#e0f2fe' : '#f1f5f9'}; color:${lakeviewReviewReady ? '#075985' : '#475569'}; padding:3px 7px; font-size:11px; font-weight:700;">Lakeview National ${lakeviewReviewReady ? 'review screen' : 'review unavailable'}</span><br><span style="color:#334155; font-size:10px; font-weight:700;">Selected ${escapeHtml(lakeviewUnitLabel)} listing-price review cap: ${formatFirstHomeDollars(lakeviewNational?.priceCap || LAKEVIEW_DEFAULT_PRICE_CAPS[1])}${lakeviewNational?.localReviewCap ? ' (local review value)' : ''}</span><br><span style="color:#64748b; font-size:10px;">${escapeHtml(lakeviewNational?.reason || 'Lakeview National review metadata is unavailable for this saved listing.')}</span><br><span style="color:#64748b; font-size:10px;">Review only — a listing sales price does not establish the loan amount, qualification, or approval.</span></div>`;
                const fhfaCountyLimit = listing.overlayEligibility?.fhfaCountyLimit;
                const fhfaMarkup = fhfaCountyLimit?.available
                    ? `<div style="margin-top: 8px; border-top: 1px solid #ede9fe; padding-top: 8px;"><span style="display:inline-block; border-radius:999px; background:${fhfaCountyLimit.reviewReady ? '#ede9fe' : '#fef2f2'}; color:${fhfaCountyLimit.reviewReady ? '#5b21b6' : '#b91c1c'}; padding:3px 7px; font-size:11px; font-weight:700;">FHFA 2026 county price review</span><br><span style="color:#334155; font-size:10px; font-weight:700;">${escapeHtml(fhfaCountyLimit.county || 'County')} County · ${escapeHtml(String(fhfaCountyLimit.unitCount || '—'))}-unit review value: ${formatFirstHomeDollars(fhfaCountyLimit.priceCap)}</span><br><span style="color:#64748b; font-size:10px;">${escapeHtml(fhfaCountyLimit.reason || 'County review context unavailable.')}</span><br><span style="color:#64748b; font-size:10px;">Review only — the listed price is not a loan amount, qualification, or approval decision.</span></div>`
                    : '';
                const calhfaMyHome = listing.overlayEligibility?.calhfaMyHome;
                const calhfaMarkup = calhfaMyHome?.available
                    ? `<div style="margin-top: 8px; border-top: 1px solid #fef3c7; padding-top: 8px;"><span style="display:inline-block; border-radius:999px; background:${calhfaMyHome.reviewReady ? '#fef3c7' : '#f1f5f9'}; color:${calhfaMyHome.reviewReady ? '#92400e' : '#475569'}; padding:3px 7px; font-size:11px; font-weight:700;">CalHFA MyHome property context</span><br><span style="color:#334155; font-size:10px; font-weight:700;">${escapeHtml(String(calhfaMyHome.propertyType || 'Property type'))} · ${escapeHtml(String(calhfaMyHome.unitCount || '—'))}-unit</span><br><span style="color:#64748b; font-size:10px;">${escapeHtml(calhfaMyHome.reason || 'CalHFA MyHome review context unavailable.')}</span><br><span style="color:#64748b; font-size:10px;">Review only — CalHFA publishes no general sales-price limit; this is not a borrower qualification or approval decision.</span></div>`
                    : '';
                const idahoMrbTaxExempt = listing.overlayEligibility?.idahoMrbTaxExempt;
                const idahoMrbMarkup = idahoMrbTaxExempt?.available
                    ? `<div style="margin-top: 8px; border-top: 1px solid #d1fae5; padding-top: 8px;"><span style="display:inline-block; border-radius:999px; background:${idahoMrbTaxExempt.reviewReady ? '#d1fae5' : '#fef2f2'}; color:${idahoMrbTaxExempt.reviewReady ? '#065f46' : '#b91c1c'}; padding:3px 7px; font-size:11px; font-weight:700;">Idaho Housing Tax-Exempt/MRB price review</span><br><span style="color:#334155; font-size:10px; font-weight:700;">${escapeHtml(idahoMrbTaxExempt.county || 'County')} County · ${idahoMrbTaxExempt.targetedStatus === 'targeted' ? 'Targeted' : 'Non-targeted'} chart row · ${formatFirstHomeDollars(idahoMrbTaxExempt.salesPriceLimit)}</span><br><span style="color:#64748b; font-size:10px;">Chart effective ${escapeHtml(String(idahoMrbTaxExempt.sourceEffectiveDate || '2026-05-06'))}; revised ${escapeHtml(String(idahoMrbTaxExempt.sourceRevisionDate || '2026-06-03'))}.</span><br><span style="color:#64748b; font-size:10px;">${escapeHtml(idahoMrbTaxExempt.reason || 'Idaho MRB review context unavailable.')}</span><br><span style="color:#64748b; font-size:10px;">Review only — listed price does not establish income, first-time status, targeted-area qualification, property eligibility, or approval.</span></div>`
                    : '';
                
                // Listing agent info
                const agent = listing.listingAgent || {};
                const agentName = agent.name || 'N/A';
                const agentPhone = agent.phone || '';
                const agentEmail = agent.email || '';
                const agentWebsite = agent.website || '';
                const agentPhoneHref = safePhoneHref(agentPhone);
                const agentEmailHref = safeMailHref(agentEmail);
                const agentWebsiteHref = safeExternalHttpUrl(agentWebsite);
                
                // Build Zillow link
                const zillowAddress = encodeURIComponent(address);
                const zillowUrl = `https://www.zillow.com/homes/${zillowAddress}_rb/`;
                
                // Price label (floating above marker)
                const priceLabel = price !== 'N/A' ? price : '';
                
                // Custom marker with price label
                const customIcon = L.divIcon({
                    className: 'price-marker',
                    html: `
                        <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
                            <div style="
                                background: rgba(15, 23, 42, 0.95);
                                color: ${lakeviewOverlayActive && lakeviewReviewReady ? '#38bdf8' : '#22c55e'};
                                font-size: 12px;
                                font-weight: 700;
                                font-family: system-ui, sans-serif;
                                padding: 3px 8px;
                                border-radius: 6px;
                                border: 1.5px solid ${lakeviewOverlayActive && lakeviewReviewReady ? '#38bdf8' : '#22c55e'};
                                white-space: nowrap;
                                box-shadow: 0 2px 8px rgba(0,0,0,0.5);
                                margin-bottom: 2px;
                            ">${priceLabel}</div>
                            <div style="
                                width: 12px;
                                height: 12px;
                                background: ${lakeviewOverlayActive && lakeviewReviewReady ? '#0284c7' : '#4f46e5'};
                                border: 2px solid white;
                                border-radius: 50%;
                                box-shadow: 0 2px 6px rgba(0,0,0,0.5);
                            "></div>
                            <div style="
                                width: 2px;
                                height: 8px;
                                background: ${lakeviewOverlayActive && lakeviewReviewReady ? '#0284c7' : '#4f46e5'};
                            "></div>
                        </div>
                    `,
                    iconSize: [0, 0],
                    iconAnchor: [0, 0],
                    popupAnchor: [0, -10]
                });
                
                                               const marker = L.marker([listing.latitude, listing.longitude], { icon: customIcon })
                    .on('click', () => {
                        window.highlightTractForMarker(listing.longitude, listing.latitude);
                    })
                    .bindPopup(`
                        <div class="text-sm font-sans" style="min-width: 270px; max-width: 320px; color: #1e293b;">
                            ${topBadgesMarkup}
                            <strong style="color: #059669; font-size: 16px; font-weight: 700;">${price}</strong><br>
                            <span style="color: #334155; font-size: 12px; font-weight: 600;">${escapeHtml(String(beds))} bed · ${escapeHtml(String(baths))} bath${sqft ? ' · ' + escapeHtml(String(sqft)) : ''} · Built ${escapeHtml(String(yearBuilt))}</span><br>
                            <span style="color: #334155; font-size: 12px; font-weight: 600;">Days on Market: <strong style="font-weight: 700; color: #1e293b;">${escapeHtml(String(daysOnMarket))}</strong></span><br>
                            <span style="color: #1e293b; font-size: 12px; font-weight: 600;">${escapeHtml(String(address))}</span><br>
                            <span style="color: #4f46e5; font-size: 12px; font-weight: 600;">${escapeHtml(String(propType))}</span>
                            ${mls ? `<br><span style="color: #334155; font-size: 12px; font-weight: 600;">MLS#: <span style="font-family: monospace; color: #d97706; font-weight: 700;">${escapeHtml(String(mls))}</span>${mlsName ? ' (' + escapeHtml(String(mlsName)) + ')' : ''}</span>` : ''}

                            <!-- 🌟 LISTING AGENT MOVED UP: Prominently displayed right under property specs -->
                            <div style="border-top: 1px solid #e2e8f0; margin-top: 8px; padding-top: 8px; background: #f8fafc; padding: 8px; border-radius: 8px; border: 1px solid #cbd5e1;">
                                <div style="color: #0f172a; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.025em; margin-bottom: 2px;">Listing Agent</div>
                                <div style="color: #1e293b; font-size: 13px; font-weight: 700;">${escapeHtml(String(agentName))}</div>
                                ${agentPhoneHref ? `<div style="margin-top: 2px;"><a href="${agentPhoneHref}" style="color: #2563eb; font-size: 12px; font-weight: 600; text-decoration: none;">📞 ${escapeHtml(String(agentPhone))}</a></div>` : ''}
                                ${agentEmailHref ? `<div style="margin-top: 2px;"><a href="${agentEmailHref}" style="color: #2563eb; font-size: 12px; font-weight: 600; text-decoration: none;">✉️ ${escapeHtml(String(agentEmail))}</a></div>` : ''}
                                ${agentWebsiteHref ? `<div style="margin-top: 2px;"><a href="${escapeHtml(agentWebsiteHref)}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; font-size: 12px; font-weight: 600; text-decoration: none;">🌐 Agent Website</a></div>` : ''}
                            </div>

                            ${firstHomeMarkup}
                            ${fhfaMarkup}
                            ${calhfaMarkup}
                            ${idahoMrbMarkup}
                            ${lakeviewMarkup}

                            ${renderFullRentcastRecord(listing)}
                            
                            <div style="margin-top: 10px;">
                                <a href="${zillowUrl}" target="_blank"
                                    style="display: block; width: 100%; text-align: center; border-radius: 8px; background: #2563eb; padding: 8px 12px; color: #ffffff; font-size: 13px; font-weight: 700; text-decoration: none; box-shadow: 0 1px 3px rgba(0,0,0,0.2);">
                                    🏠 View on Zillow
                                </a>
                            </div>
                        </div>
                    `, { 
                        maxWidth: 350,
                        maxHeight: 520,
                        autoPan: true,
                        autoPanPadding: [20, 20]
                    });
				window.listingMarkers.addLayer(marker);
            }
        });
        
        try {
            if (listings.length > 0 && window.listingMarkers && window.listingMarkers.getLayers() && window.listingMarkers.getLayers().length > 0) {
                const bounds = window.listingMarkers.getBounds();
                if (bounds && bounds.isValid()) {
                    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
                }
            }
        } catch (e) {
            console.warn('Could not fit map to bounds:', e.message);
        }
    }
            // --- SEARCH MODE: OFFLINE (cached only) vs LIVE (fresh API pull) ---
    let searchMode = 'offline'; // 'offline' or 'live'
    
    function setSearchMode(mode) {
        searchMode = mode;
        const btnOffline = document.getElementById('btnModeOffline');
        const btnLive = document.getElementById('btnModeLive');
        const modeLabel = document.getElementById('searchModeLabel');
        const searchBtn = document.getElementById('btnSearch');
        
        if (mode === 'offline') {
            btnOffline.className = 'flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition bg-slate-950 text-slate-200 shadow-sm';
            btnLive.className = 'flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition text-slate-400 hover:text-slate-200';
            modeLabel.textContent = '📂 Viewing saved listings only — no API calls';
            searchBtn.innerHTML = '📂 View Saved Listings';
            searchBtn.className = 'w-full rounded-xl bg-gradient-to-r from-slate-600 to-slate-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:from-slate-500 hover:to-slate-600';
        } else {
            btnLive.className = 'flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition bg-slate-950 text-amber-400 shadow-sm';
            btnOffline.className = 'flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition text-slate-400 hover:text-slate-200';
            modeLabel.textContent = '🔄 Live pull — will use API calls if not cached';
            searchBtn.innerHTML = '🔍 Search Live Listings';
            searchBtn.className = 'w-full rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/10 hover:from-indigo-600 hover:to-indigo-700';
        }
    }
	    // --- SHARED SAVED-PULL BROWSER (cache-only, never calls Rentcast) ---
	    let sharedSavedPulls = [];
	    let liveProgramReviewConfiguration = { programs: [] };

	    function getLiveProgramReviewDefinition(programId) {
	        return (liveProgramReviewConfiguration?.programs || []).find((program) => program?.id === programId) || null;
	    }

	    function applyLiveProgramReviewConfiguration(configuration) {
	        if (!configuration || !Array.isArray(configuration.programs)) return;
	        liveProgramReviewConfiguration = configuration;
	        configuration.programs.forEach((program) => {
	            const option = document.querySelector(`#savedOverlaySelect option[value="${program.id}"]`);
	            if (option && program.label) option.textContent = program.label;
	        });
	    }

	    function configuredProgramReviewListings(pull, overlay) {
        if (overlay === 'usda') return (pull?.overlaySets?.all || []).filter(usdaListingPasses);
        if (overlay === 'lmiUsda') return (pull?.overlaySets?.all || []).filter(l => l?.overlayEligibility?.lmi && usdaListingPasses(l));
	        const program = getLiveProgramReviewDefinition(overlay);
	        if (!program) return null;
	        if (program.id === 'firstHome') return (pull?.overlaySets?.all || []).filter(firstHomeListingPasses);
	        if (program.id === 'lakeviewNational') return (pull?.overlaySets?.all || []).filter(lakeviewListingPasses);
	        return pull?.programReviewSets?.[program.id] || [];
	    }

    function formatSavedPullLabel(pull) {
        const area = pull.area || {};
        const label = area.label || [area.city, area.county, area.zipCode, area.state].filter(Boolean).join(' · ') || pull.cacheKey;
        const when = pull.savedAt ? new Date(pull.savedAt).toLocaleString() : 'date unavailable';
        return `${label} — ${pull.count || pull.overlaySets?.all?.length || 0} listings (${when})`;
    }

    function renderSelectedSavedPull() {
        const select = document.getElementById('savedPullSelect');
        const overlay = document.getElementById('savedOverlaySelect').value;
        const status = document.getElementById('savedPullStatus');
        const tractField = document.getElementById('formTract');
        const pull = sharedSavedPulls.find((item) => item.snapshotId === select.value);
        syncLakeviewPriceCapControls(pull);
        syncUsdaRdControls();
        document.getElementById('fhfaCountyLimitDisclosure')?.classList.toggle('hidden', overlay !== 'fhfaCountyLimit');
        document.getElementById('calhfaMyHomeDisclosure')?.classList.toggle('hidden', overlay !== 'calhfaMyHome');
        document.getElementById('idahoMrbTaxExemptDisclosure')?.classList.toggle('hidden', overlay !== 'idahoMrbTaxExempt');
        if (!pull) return;
	        const configuredListings = configuredProgramReviewListings(pull, overlay);
	        const listings = configuredListings || (pull.overlaySets?.[overlay] || []);
	        const overlayLabel = getLiveProgramReviewDefinition(overlay)?.shortLabel
	            || { all: 'all eligible', lmi: 'LMI', usda: 'USDA RD eligible', lmiUsda: 'LMI + USDA RD eligible' }[overlay]
	            || overlay;
        tractField.value = `${listings.length} saved ${overlayLabel} listings`;
        status.textContent = `Showing ${listings.length} ${overlayLabel} listings from ${formatSavedPullLabel(pull)}. Cache-only — no Rentcast call.`;
        displayListingsOnMap(listings);
    }

    async function loadSharedSavedPulls() {
        const select = document.getElementById('savedPullSelect');
        const status = document.getElementById('savedPullStatus');
        select.innerHTML = '<option value="">Loading saved pulls…</option>';
        try {
            const response = await fetch('/api/map-saved-listings');
            if (!response.ok) throw new Error(`Saved listing request failed (${response.status})`);
            const payload = await response.json();
	            applyLiveProgramReviewConfiguration(payload.programReviewConfiguration);
	            sharedSavedPulls = Array.isArray(payload.pulls) ? payload.pulls : [];
            if (!sharedSavedPulls.length) {
                select.innerHTML = '<option value="">No shared saved pulls yet</option>';
                status.textContent = 'Run a Live Pull for an area first. Saved Listings will then browse its persisted snapshot without calling Rentcast.';
                return;
            }
            select.innerHTML = sharedSavedPulls.map((pull) => `<option value="${escapeHtml(pull.snapshotId)}">${escapeHtml(formatSavedPullLabel(pull))}</option>`).join('');
            renderSelectedSavedPull();
        } catch (error) {
            console.error('Shared saved-pull load failed:', error);
            select.innerHTML = '<option value="">Saved pulls unavailable</option>';
            status.textContent = 'Could not load shared saved pulls. Existing browser-saved listings remain available through the normal Saved Listings search.';
        }
    }

    // --- 9. FORM PIPELINE HOOKS & DOM REGISTER HANDLERS ---
    function registerEventListeners() {
        document.getElementById('toggleGeoJson').addEventListener('change', renderSpatialLayers);
        document.getElementById('btnResetApiCounter').addEventListener('click', resetApiCounter);
        document.getElementById('toggleLMI').addEventListener('change', (e) => {
            toggleLMILayer(e.target.checked);
        });
        document.getElementById('toggleUSDA').addEventListener('change', (e) => {
            toggleUSDALayer(e.target.checked);
        });
        document.getElementById('toggleLakeview')?.addEventListener('change', (e) => {
            toggleLakeviewLayer(e.target.checked);
        });
        document.getElementById('stateSelect').addEventListener('change', () => {
            if (usdaDataLoaded && document.getElementById('toggleUSDA').checked) {
                renderUSDAAreas();
            }
        });
        document.getElementById('btnClearListings').addEventListener('click', function() {
    if (window.listingMarkers) {
        map.removeLayer(window.listingMarkers);
        window.listingMarkers = null;
    }
    document.getElementById('formTract').value = '';
    document.getElementById('formCoords').value = '';
});
        document.getElementById('btnResetMap').addEventListener('click', function() {
    // Reset map view to initial state (Eugene)
    map.setView([44.0521, -123.0867], 13);
    
    // Clear listing markers
    if (window.listingMarkers) {
        map.removeLayer(window.listingMarkers);
        window.listingMarkers = null;
    }
    // Clear LMI layer
    if (lmiLayer) {
        map.removeLayer(lmiLayer);
        lmiLayer = null;
    }
    // Clear GeoJSON layer
    if (geoJsonLayer) {
        map.removeLayer(geoJsonLayer);
        geoJsonLayer = null;
    }
    // Clear USDA geographic layer
    if (usdaLayer) {
        map.removeLayer(usdaLayer);
        usdaLayer = null;
    }
    // Uncheck toggles
    document.getElementById('toggleLMI').checked = false;
    document.getElementById('toggleUSDA').checked = false;
    if (document.getElementById('toggleLakeview')) {
        document.getElementById('toggleLakeview').checked = false;
        document.getElementById('lakeviewLegend')?.classList.add('hidden');
    }
    document.getElementById('toggleGeoJson').checked = false;
    document.getElementById('lmiLegend')?.classList.add('hidden');
    document.getElementById('usdaLegend')?.classList.add('hidden');
    
    // Clear form fields
    document.getElementById('formCoords').value = '';
    document.getElementById('formTract').value = '';
    document.getElementById('searchInput').value = '';
    document.getElementById('searchError').classList.add('hidden');
    
    // Hide LMI legend
    var legend = document.getElementById('lmiLegend');
    if (legend) legend.classList.add('hidden');
});
        
        // Search button — only way to trigger API calls now
                document.getElementById('btnSearch').addEventListener('click', () => {
            const query = document.getElementById('searchInput').value.trim();
            if (!query) {
                document.getElementById('searchError').textContent = '⚠️ Please enter a valid address, city, or county.';
                document.getElementById('searchError').classList.remove('hidden');
                return;
            }
            
            if (searchMode === 'offline') {
                performOfflineSearch(query);
            } else {
                performPropertySearch(query);
            }
        });
        
        // Mode toggle buttons
        document.getElementById('btnModeOffline').addEventListener('click', () => setSearchMode('offline'));
        document.getElementById('btnModeLive').addEventListener('click', () => setSearchMode('live'));
        document.getElementById('btnRefreshSavedPulls').addEventListener('click', loadSharedSavedPulls);
        document.getElementById('savedPullSelect').addEventListener('change', renderSelectedSavedPull);
        document.getElementById('savedOverlaySelect').addEventListener('change', renderSelectedSavedPull);
        document.querySelectorAll('[data-lakeview-price-cap]').forEach((slider) => slider.addEventListener('input', (event) => {
            const unitCount = Number(event.target.dataset.lakeviewPriceCap);
            saveLakeviewPriceCap(unitCount, Number(event.target.value));
            syncLakeviewPriceCapControls();
            renderSelectedSavedPull();
        }));
        
        
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

        const lakeviewIncomeSlider = document.getElementById('lakeviewBorrowerIncome');
        if (lakeviewIncomeSlider) {
            lakeviewIncomeSlider.addEventListener('input', (event) => {
                const val = Number(event.target.value);
                const out = document.getElementById('lakeviewBorrowerIncomeValue');
                if (out) out.textContent = val > 0 ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val) : 'Off';
                renderSelectedSavedPull();
            });
        }
        document.getElementById('btnResetLakeviewPriceCap').addEventListener('click', () => {
            localStorage.removeItem(LAKEVIEW_PRICE_CAP_STORAGE_KEY);
            syncLakeviewPriceCapControls();
            renderSelectedSavedPull();
        });
        document.getElementById('firstHomeCountySelect').addEventListener('change', renderFirstHomeLimitControls);
        document.getElementById('btnResetFirstHomeOverrides').addEventListener('click', () => {
            localStorage.removeItem(FIRST_HOME_OVERRIDE_STORAGE_KEY);
            renderFirstHomeLimitControls();
            renderSelectedSavedPull();
        });
        
        // Allow Enter key to trigger search
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('btnSearch').click();
            }
        });

        loadFirstHomeLimits();
        loadSharedSavedPulls();

        // Map click — now only captures coordinates, NO API call
        map.on('click', async (e) => {
            const lat = e.latlng.lat;
            const lng = e.latlng.lng;
            
            document.getElementById('formCoords').value = lat.toFixed(4) + ", " + lng.toFixed(4);
            
            markerGroup.clearLayers();
            L.marker([lat, lng]).addTo(markerGroup)
                .on('click', () => { window.highlightTractForMarker(lng, lat); })
                .bindPopup('<span class="text-xs font-mono text-slate-900">📍 Selected: ' + lat.toFixed(4) + ', ' + lng.toFixed(4) + '</span>')
                .openPopup();

            await fetchCensusTractDataApi(lat, lng);
            // No API call here — user must use search bar for listings
        });

        document.getElementById('intakeForm').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const name = document.getElementById('formName').value;
            const email = document.getElementById('formEmail').value;
            const coords = document.getElementById('formCoords').value;
            const tract = document.getElementById('formTract').value;

            if (!coords) {
                alert("⚠️ Please select a location on the map or search for a location first.");
                return;
            }

            const newLead = {
                name: name,
                email: email,
                coords: coords,
                tract: tract || "Not Resolved",
                tasks: ["Webhook Fired", "CRM Row Appended"],
                status: "Synced"
            };

            appState.leads.unshift(newLead);
            synchronizeCrmUi();
            
            document.getElementById('intakeForm').reset();
            markerGroup.clearLayers();
            
            alert("🚀 Lead captured for " + name + "!\n\nWe'll send you active listings in this area within 24 hours.");
        });
    }

    // --- 10. VISUAL GRAPHICS ENGINE TERMINALS ---
    function synchronizeCrmUi() {
        const tableBody = document.getElementById('crmTableBody');
        const countLabel = document.getElementById('leadCount');
        
        countLabel.textContent = appState.leads.length;
        tableBody.innerHTML = '';

        appState.leads.forEach(lead => {
            const tr = document.createElement('tr');
            tr.className = "hover:bg-slate-800/40 transition border-b border-slate-800/60";
            
            let taskBadges = '';
            lead.tasks.forEach(t => {
                taskBadges += '<span class="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-slate-300 border border-slate-700 mr-1">' + escapeHtml(t) + '</span>';
            });

            const statusClass = lead.status === 'Synced' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20';

            tr.innerHTML = 
                '<td class="p-3">' +
                    '<div class="font-semibold text-slate-200">' + escapeHtml(lead.name) + '</div>' +
                    '<div class="text-xs text-slate-500">' + escapeHtml(lead.email) + '</div>' +
                '</td>' +
                '<td class="p-3 font-mono text-xs text-slate-400">' + escapeHtml(lead.coords) + '</td>' +
                '<td class="p-3 font-mono text-xs text-amber-400">' + escapeHtml(lead.tract) + '</td>' +
                '<td class="p-3"><div class="flex flex-wrap gap-1">' + taskBadges + '</div></td>' +
                '<td class="p-3 text-right">' +
                    '<span class="inline-flex rounded-full ' + statusClass + ' px-2 py-0.5 text-xs font-semibold">' +
                        escapeHtml(lead.status) +
                    '</span>' +
                '</td>';
            tableBody.appendChild(tr);
        });
    }

    function escapeHtml(str) {
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    // --- 11. EXPORT FUNCTIONALITY ---
    function downloadFile(content, fileName, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function exportCRM(format) {
        const leads = appState.leads || [];
        if (format === 'json') {
            downloadFile(JSON.stringify(leads, null, 2), 'crm_leads.json', 'application/json');
        } else {
            const headers = ['Name', 'Email', 'Coordinates', 'Tract GeoID', 'Status', 'Tasks'];
            let csvContent = headers.join(',') + '\n';
            leads.forEach(lead => {
                const row = [
                    `"${(lead.name || '').replace(/"/g, '""')}"`,
                    `"${(lead.email || '').replace(/"/g, '""')}"`,
                    `"${(lead.coords || '').replace(/"/g, '""')}"`,
                    `"${(lead.tract || '').replace(/"/g, '""')}"`,
                    `"${(lead.status || '').replace(/"/g, '""')}"`,
                    `"${((lead.tasks || []).join('; ')).replace(/"/g, '""')}"`
                ];
                csvContent += row.join(',') + '\n';
            });
            downloadFile(csvContent, 'crm_leads.csv', 'text/csv');
        }
    }

    function openSavedListingsExportModal() {
        const container = document.getElementById('exportLocationsContainer');
        container.innerHTML = '';
        
        if (!sharedSavedPulls || sharedSavedPulls.length === 0) {
            container.innerHTML = '<p class="text-sm text-slate-400 italic">No saved pulls available to export.</p>';
        } else {
            sharedSavedPulls.forEach((pull, index) => {
                const div = document.createElement('div');
                div.className = "flex items-center px-2 py-1.5 hover:bg-slate-800 rounded transition cursor-pointer";
                div.onclick = function(e) {
                    if (e.target.tagName !== 'INPUT') {
                        const cb = document.getElementById('export_cb_' + index);
                        cb.checked = !cb.checked;
                        updateSelectAllState();
                    }
                };
                div.innerHTML = `
                    <input type="checkbox" id="export_cb_${index}" value="${index}" class="export-pull-cb mr-3 w-4 h-4 text-indigo-500 rounded focus:ring-indigo-500 bg-slate-700 border-slate-600" onchange="updateSelectAllState()" />
                    <label for="export_cb_${index}" class="text-sm text-slate-300 flex-1 cursor-pointer pointer-events-none">
                        ${escapeHtml(pull.area?.label || pull.cacheKey || 'Unknown Area')} 
                        <span class="text-xs text-slate-500 ml-2">(${pull.count} properties)</span>
                    </label>
                `;
                container.appendChild(div);
            });
        }
        
        document.getElementById('selectAllExportsCheckbox').checked = false;
        document.getElementById('savedListingsExportModal').classList.remove('hidden');
    }

    function closeSavedListingsExportModal() {
        document.getElementById('savedListingsExportModal').classList.add('hidden');
    }

    window.onSelectAllCheckboxChange = function(isChecked) {
        const cbs = document.querySelectorAll('.export-pull-cb');
        cbs.forEach(cb => cb.checked = isChecked);
    };

    function toggleSelectAllExports(e) {
        if (e && e.target && e.target.tagName === 'INPUT') return;
        const mainCb = document.getElementById('selectAllExportsCheckbox');
        if (mainCb) {
            mainCb.checked = !mainCb.checked;
            window.onSelectAllCheckboxChange(mainCb.checked);
        }
    }

    window.updateSelectAllState = function() {
        const cbs = Array.from(document.querySelectorAll('.export-pull-cb'));
        const mainCb = document.getElementById('selectAllExportsCheckbox');
        if (cbs.length > 0 && mainCb) {
            mainCb.checked = cbs.every(cb => cb.checked);
        }
    };

    function executeSavedListingsExport(format) {
        const cbs = document.querySelectorAll('.export-pull-cb:checked');
        if (cbs.length === 0) {
            alert("Please select at least one location to export.");
            return;
        }

        let allListingsToExport = [];
        
        const currentOverlay = document.getElementById('savedOverlaySelect')?.value || 'all';
        cbs.forEach(cb => {
            const pullIndex = parseInt(cb.value, 10);
            const pull = sharedSavedPulls[pullIndex];
            if (pull && pull.overlaySets) {
                // Respect the currently selected overlay filter, including the Lakeview income slider
                const configuredListings = configuredProgramReviewListings(pull, currentOverlay);
                const sourceListings = configuredListings || (pull.overlaySets[currentOverlay] || pull.overlaySets.all || []);
                
                const properties = sourceListings.map(p => ({
                    ...p,
                    _exportCityName: p.city ? p.city.trim() : (pull.area?.label || 'Unknown')
                }));
                allListingsToExport = allListingsToExport.concat(properties);
            }
        });

        // Sort alphabetically A-Z by city name, then numerically by price (lowest to highest)
        allListingsToExport.sort((a, b) => {
            const cityA = (a._exportCityName || '').toLowerCase();
            const cityB = (b._exportCityName || '').toLowerCase();
            if (cityA < cityB) return -1;
            if (cityA > cityB) return 1;
            
            const priceA = a.price || 0;
            const priceB = b.price || 0;
            return priceA - priceB;
        });

        if (format === 'json') {
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
            csvContent += '"EXPORT METADATA & LEGEND"\n';
            csvContent += '"Lakeview National","Requires borrower income to be at or below 140% of the Fannie Mae Area Median Income (AMI) for the county."\n';
            csvContent += '"OHCS Flex Lending FirstHome","Requires property to be in an FFIEC LMI tract and listed at or below the 2026 OHCS purchase price limit for the county."\n';
            csvContent += '"USDA RD Guaranteed","Requires property to be located outside USDA designated ineligible urban areas, and borrower income within county limits for the specified household size."\n';
            csvContent += '"Disclaimer","This is a screening aid only. A listing price does not establish loan amount, borrower qualification, or approval."\n\n';

            csvContent += headers.join(',') + '\n';
            
            allListingsToExport.forEach(p => {
                const agent = p.listingAgent || {};
                
                let emailOut = agent.email || '';
                if (emailOut) {
                    emailOut = `=HYPERLINK(""mailto:${emailOut}"", ""${emailOut}"")`;
                }
                
                let websiteOut = agent.website || '';
                if (websiteOut) {
                    websiteOut = `=HYPERLINK(""${websiteOut}"", ""Agent Website"")`;
                }

                const row = [
                    `"${(p.city || '').replace(/"/g, '""')}"`,
                    `"${(p.addressLine1 || '').replace(/"/g, '""')}"`,
                    `"${(p.state || '').replace(/"/g, '""')}"`,
                    `"${(p.zipCode || '').replace(/"/g, '""')}"`,
                    p.price ? p.price : '',
                    `"${(p.propertyType || '').replace(/"/g, '""')}"`,
                    p.squareFootage || '',
                    p.bedrooms || '',
                    p.bathrooms || '',
                    `"${(p.status || '').replace(/"/g, '""')}"`,
                    p.daysOnMarket || '',
                    `"${(p.id || '').replace(/"/g, '""')}"`,
                    `"${lakeviewListingPasses(p) ? 'Yes' : 'No'}"`,
                    `"${firstHomeListingPasses(p) ? 'Yes' : 'No'}"`,
                    `"${usdaListingPasses(p) ? 'Yes' : 'No'}"`,
                    `"${(agent.name || '').replace(/"/g, '""')}"`,
                    `"${(agent.phone || '').replace(/"/g, '""')}"`,
                    `"${emailOut}"`,
                    `"${websiteOut}"`,
                    `"${(agent.brokerage || '').replace(/"/g, '""')}"`
                ];
                csvContent += row.join(',') + '\n';
            });
            
            downloadFile(csvContent, 'saved_listings.csv', 'text/csv');
        }
        
        closeSavedListingsExportModal();
    }
    