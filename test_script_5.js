
(function initGeoSphereLeadBridge() {
  window.GeoSphereLeadBridge = {
    currentContext: {
      latitude: null,
      longitude: null,
      censusTract: null,
      county: null,
      state: 'OR',
      lmiStatus: null,
      isLmiEligible: false,
      isUsdaEligible: false,
      selectedListingId: null,
      selectedListingPrice: null,
      selectedAddress: null,
      timestamp: null
    },

    // 1. Capture and resolve spatial context from physical touch
    async captureTouch(lat, lng, tract = null, label = null, meta = {}) {
      const numLat = Number(lat);
      const numLng = Number(lng);
      
      const coordsField = document.getElementById('formCoords');
      const tractField = document.getElementById('formTract');
      if (coordsField) coordsField.value = `${numLat.toFixed(4)}, ${numLng.toFixed(4)}`;
      
      let resolvedTract = tract;
      if (!resolvedTract && typeof fetchCensusTractDataApi === 'function') {
        resolvedTract = await fetchCensusTractDataApi(numLat, numLng);
      }
      if (tractField && resolvedTract) tractField.value = resolvedTract;

      const isUsda = meta.isUsda !== undefined ? meta.isUsda : (meta.layerName === 'usda');
      const isLmi = meta.isLmi !== undefined ? meta.isLmi : (meta.layerName === 'lmi');

      this.currentContext = {
        latitude: numLat,
        longitude: numLng,
        censusTract: resolvedTract || '41039002747',
        county: meta.county || 'Lane',
        state: meta.state || 'OR',
        lmiStatus: isLmi ? 'Moderate' : 'Middle',
        isLmiEligible: Boolean(isLmi),
        isUsdaEligible: Boolean(isUsda),
        selectedListingId: meta.listingId || null,
        selectedListingPrice: meta.price || null,
        selectedAddress: label || meta.address || null,
        timestamp: new Date().toISOString()
      };

      // Broadcast to FTHB Dashboard & Vantage AI Studio via postMessage
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'GEOSPHERE_MAP_TOUCH',
          spatialContext: this.currentContext,
          data: this.currentContext
        }, '*');
      }

      // Dispatch local events for React CRM
      window.dispatchEvent(new CustomEvent('GEOSPHERE_SPATIAL_SYNC', { detail: this.currentContext }));
      window.dispatchEvent(new CustomEvent('geosphere_map_touch', { detail: this.currentContext }));
      window.dispatchEvent(new CustomEvent('geosphere:spatial_touch', { detail: this.currentContext }));

      return this.currentContext;
    },

    // 2. Submit or attach captured spatial profile to lead contact
    async syncLeadToHub(leadContactData = {}) {
      const payload = {
        ...leadContactData,
        spatialProfile: this.currentContext,
        syncedAt: new Date().toISOString()
      };

      try {
        const response = await fetch('/api/geosphere-lead-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        return await response.json();
      } catch (err) {
        const existing = JSON.parse(localStorage.getItem('geosphere_captured_leads') || '[]');
        existing.unshift(payload);
        localStorage.setItem('geosphere_captured_leads', JSON.stringify(existing.slice(0, 50)));
        return { status: 'cached', payload };
      }
    }
  };

  // Auto-bind to leaflet map click when ready
  window.addEventListener('DOMContentLoaded', () => {
    if (typeof map !== 'undefined' && map && map.on) {
      map.on('click', (e) => {
        window.GeoSphereLeadBridge.captureTouch(e.latlng.lat, e.latlng.lng, null, 'Custom Map Pin');
      });
    }
  });
})();
