const initLocationMap = () => {
    const locationMap = new maplibregl.Map({
        container: 'locationMap',
        style: 'https://tiles.openfreemap.org/styles/bright',
        center: [28.8889709, 47.0384012],
        zoom: 16,
        scrollZoom: false,
        attributionControl: { compact: true },
    });

    let pointerOverMap = false;
    const locationMapContainer = document.getElementById('locationMap');
    locationMapContainer.addEventListener('pointerenter', () => {
        pointerOverMap = true;
    });
    locationMapContainer.addEventListener('pointerleave', () => {
        pointerOverMap = false;
    });
    const zoomHint = document.createElement('div');
    zoomHint.className = 'map-zoom-hint';
    zoomHint.innerHTML = '<span><kbd>Ctrl +</kbd> derulare pentru zoom</span>';
    locationMapContainer.parentElement.appendChild(zoomHint);
    const hideZoomHint = () => zoomHint.classList.remove('show');

    locationMapContainer.addEventListener('pointerleave', hideZoomHint);
    window.addEventListener('blur', hideZoomHint);
    document.addEventListener('keyup', (event) => {
        if (event.key === 'Control' || event.key === 'Meta') hideZoomHint();
    });

    locationMapContainer.addEventListener(
        'wheel',
        (event) => {
            if (!event.ctrlKey) return;

            hideZoomHint();
            event.preventDefault();
            locationMap.zoomTo(locationMap.getZoom() - event.deltaY * 0.005, {
                around: locationMap.unproject([event.offsetX, event.offsetY]),
            });
        },
        { passive: false },
    );
    document.addEventListener(
        'keydown',
        (event) => {
            if (!pointerOverMap || !(event.ctrlKey || event.metaKey)) return;

            if (event.key === 'Control' || event.key === 'Meta') {
                zoomHint.classList.add('show');
                return;
            }

            const zoomIn = ['+', '=', 'Add'].includes(event.key) || event.code === 'NumpadAdd';
            const zoomOut =
                ['-', '_', 'Subtract'].includes(event.key) || event.code === 'NumpadSubtract';
            if (!zoomIn && !zoomOut) return;

            hideZoomHint();
            event.preventDefault();
            locationMap.zoomTo(locationMap.getZoom() + (zoomIn ? 1 : -1));
        },
        true,
    );

    locationMap.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left');
    locationMap.once('load', () => {
        locationMap.getContainer().querySelector('.maplibregl-ctrl-attrib')?.removeAttribute('open');
    });
    locationMap.on('style.load', () => {
        const visibleMapLabels = new Set([
            'highway-name-path',
            'highway-name-minor',
            'highway-name-major',
            'poi_r1',
            'poi_r7',
            'poi_r20',
        ]);
        locationMap
            .getStyle()
            .layers.filter((layer) => layer.type === 'symbol')
            .forEach((layer) => {
                if (layer.id.startsWith('poi_r')) {
                    locationMap.setFilter(layer.id, [
                        'all',
                        layer.filter,
                        ['in', ['get', 'class'], ['literal', ['park', 'playground', 'school']]],
                    ]);
                }
                locationMap.setLayoutProperty(
                    layer.id,
                    'visibility',
                    visibleMapLabels.has(layer.id) ? 'visible' : 'none',
                );
            });
    });

    const locationMarker = document.createElement('div');
    locationMarker.className = 'progaming-map-marker';
    locationMarker.innerHTML =
        '<span class="progaming-map-pin"><i class="fas fa-location-dot" aria-hidden="true"></i></span><span class="progaming-map-label">ProGaming Hub</span>';
    new maplibregl.Marker({ element: locationMarker, anchor: 'bottom-left', offset: [-17, 0] })
        .setLngLat([28.8889709, 47.0384012])
        .addTo(locationMap);

    const mapStops = window.MAP_STOPS || [];
    mapStops.forEach((stop) => {
        const stopMarker = document.createElement('div');
        stopMarker.className = 'stop-map-marker';
        stopMarker.innerHTML = '<i class="fas fa-bus" aria-hidden="true"></i><span></span>';
        stopMarker.querySelector('span').textContent = stop.name;
        new maplibregl.Marker({ element: stopMarker, anchor: 'left', offset: [-13, 0] })
            .setLngLat(stop.lngLat)
            .addTo(locationMap);
    });
    if (mapStops.length) {
        const stopBounds = new maplibregl.LngLatBounds(
            [28.8889709, 47.0384012],
            [28.8889709, 47.0384012],
        );
        mapStops.forEach((stop) => stopBounds.extend(stop.lngLat));
        locationMap.fitBounds(stopBounds, {
            padding: { top: 80, bottom: 50, left: 30, right: 160 },
            maxZoom: 16,
            animate: false,
        });
    }
};

const locationMapTarget = document.getElementById('locationMap');
if ('IntersectionObserver' in window) {
    const locationMapObserver = new IntersectionObserver(
        (entries) => {
            if (!entries.some((entry) => entry.isIntersecting)) return;
            locationMapObserver.disconnect();
            initLocationMap();
        },
        { rootMargin: '800px' },
    );
    locationMapObserver.observe(locationMapTarget);
} else {
    initLocationMap();
}
