// OSMTimeMachine - Client-side application
// All logic runs in the browser for GitHub Pages deployment

// Global state
let map = null;
let currentPolygon = null;
let coordinates = [];
let TimeMachine = {};
let slider = null;

// Color palette for polygons
const colorPalette = [
    '#667eea', '#764ba2', '#f093fb', '#f5576c',
    '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
    '#fa709a', '#fee140', '#30cfd0', '#330867'
];

// DOM elements
const searchForm = document.getElementById('searchForm');
const wayIdInput = document.getElementById('wayIdInput');
const loadingOverlay = document.getElementById('loadingOverlay');
const errorAlert = document.getElementById('errorAlert');
const errorMessage = document.getElementById('errorMessage');
const emptyState = document.getElementById('emptyState');
const mapContainer = document.getElementById('mapContainer');
const wayBadgeContainer = document.getElementById('wayBadgeContainer');
const wayIdDisplay = document.getElementById('wayIdDisplay');
const osmLink = document.getElementById('osmLink');
const historyContent = document.getElementById('historyContent');

/**
 * Validate way ID input
 */
function validateWayId(wayId) {
    if (!wayId || !wayId.trim()) {
        return { valid: false, error: 'Way ID is required' };
    }

    const trimmedId = wayId.trim();
    const wayIdInt = parseInt(trimmedId, 10);

    if (isNaN(wayIdInt)) {
        return { valid: false, error: 'Way ID must be a valid number' };
    }

    if (wayIdInt <= 0) {
        return { valid: false, error: 'Way ID must be a positive number' };
    }

    return { valid: true, wayId: wayIdInt };
}

/**
 * Show error message
 */
function showError(message) {
    errorMessage.textContent = message;
    errorAlert.classList.remove('hidden');
}

/**
 * Hide error message
 */
function hideError() {
    errorAlert.classList.add('hidden');
}

/**
 * Show loading overlay
 */
function showLoading() {
    loadingOverlay.classList.add('active');
}

/**
 * Hide loading overlay
 */
function hideLoading() {
    loadingOverlay.classList.remove('active');
}

/**
 * Fetch way history from Overpass API
 */
async function fetchWayHistory(wayId) {
    const overpassQuery = `
        [out:json];
        timeline(way,${wayId});
        foreach(
            out;
            retro(u(t["created"]))
            (
                way(${wayId}); out meta geom;
                >; out meta;
            );
        );
    `;

    const overpassUrl = 'https://overpass-api.de/api/interpreter';

    try {
        const response = await fetch(overpassUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `data=${encodeURIComponent(overpassQuery)}`,
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();

        if (!data || typeof data !== 'object' || !data.elements) {
            throw new Error('Invalid response structure from API');
        }

        return { success: true, data };
    } catch (error) {
        console.error('Error fetching way history:', error);

        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            return {
                success: false,
                error: 'Unable to connect to Overpass API. Please check your internet connection.'
            };
        }

        return {
            success: false,
            error: error.message || 'An unexpected error occurred'
        };
    }
}

/**
 * Process API response into coordinates
 */
function processWayData(data) {
    const coords = [];

    if (!data || !data.elements) {
        return coords;
    }

    for (const element of data.elements) {
        if (element.type === 'way' && element.geometry && element.geometry.length > 0) {
            coords.push({
                geometry: element.geometry,
                version: element.version || 'Unknown',
                timestamp: element.timestamp || 'Unknown',
                user: element.user || 'Unknown',
                tags: element.tags || {}
            });
        }
    }

    return coords;
}

/**
 * Initialize map
 */
function initializeMap(firstCoord) {
    if (map) {
        map.remove();
    }

    map = L.map('map').setView([firstCoord.lat, firstCoord.lon], 18);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
        maxZoom: 20,
    }).addTo(map);
}

/**
 * Format timestamp to human-readable format
 */
function formatTimestamp(timestamp) {
    if (!timestamp || timestamp === 'Unknown') {
        return 'Unknown';
    }

    try {
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return timestamp;
    }
}

/**
 * Update history display
 */
function updateHistory(index) {
    const coord = coordinates[index];

    // Build tags HTML
    let tagsHTML = '';
    if (coord.tags && Object.keys(coord.tags).length > 0) {
        const tagElements = Object.entries(coord.tags)
            .map(([key, value]) => `<span class="tag">${key}: ${value}</span>`)
            .join('');
        tagsHTML = `
            <div class="history-item tags-container">
                <div class="history-item-label">Tags</div>
                <div class="tag-list">${tagElements}</div>
            </div>
        `;
    } else {
        tagsHTML = `
            <div class="history-item tags-container">
                <div class="history-item-label">Tags</div>
                <div class="history-item-value" style="color: var(--text-muted);">No tags</div>
            </div>
        `;
    }

    historyContent.innerHTML = `
        <div class="history-item">
            <div class="history-item-label">Version</div>
            <div class="history-item-value">${coord.version}</div>
        </div>
        <div class="history-item">
            <div class="history-item-label">Timestamp</div>
            <div class="history-item-value">${formatTimestamp(coord.timestamp)}</div>
        </div>
        <div class="history-item">
            <div class="history-item-label">Editor</div>
            <div class="history-item-value">${coord.user || 'Unknown'}</div>
        </div>
        ${tagsHTML}
    `;
}

/**
 * Create and initialize slider
 */
function initializeSlider() {
    const sliderElement = document.getElementById('slider');

    if (slider) {
        slider.destroy();
    }

    const maxVersion = coordinates.length;

    slider = noUiSlider.create(sliderElement, {
        start: 1,
        range: {
            'min': 1,
            'max': maxVersion,
        },
        step: 1,
        connect: "lower",
        pips: {
            mode: 'steps',
            stepped: true,
            density: maxVersion > 20 ? 5 : 2
        },
        tooltips: {
            to: function (value) {
                return 'v' + Math.round(value);
            }
        }
    });

    // Update polygon on slider change
    slider.on('update', function (values, handle) {
        const index = parseInt(values[handle]) - 1;
        const coord = coordinates[index];

        // Update history display
        updateHistory(index);

        // Remove old polygon
        if (currentPolygon) {
            map.removeLayer(currentPolygon);
        }

        // Add new polygon with color
        const colorIndex = index % colorPalette.length;
        currentPolygon = L.polygon(TimeMachine[coord.version], {
            color: colorPalette[colorIndex],
            fillColor: colorPalette[colorIndex],
            fillOpacity: 0.4,
            weight: 3
        }).addTo(map);

        // Fit map to polygon bounds
        try {
            map.fitBounds(currentPolygon.getBounds(), { padding: [50, 50] });
        } catch (e) {
            console.warn('Could not fit bounds:', e);
        }
    });
}

/**
 * Display way data on the map
 */
function displayWayData(wayId) {
    // Process coordinates into TimeMachine format
    TimeMachine = {};
    coordinates.forEach((coord) => {
        const geometry = coord.geometry;
        const version = coord.version;
        const polygonPoints = geometry.map(point => [point.lat, point.lon]);
        TimeMachine[version] = polygonPoints;
    });

    // Show UI elements
    emptyState.classList.add('hidden');
    wayBadgeContainer.classList.remove('hidden');
    mapContainer.classList.remove('hidden');

    // Update badge
    wayIdDisplay.textContent = wayId;
    osmLink.href = `https://www.openstreetmap.org/way/${wayId}`;

    // Initialize map
    const firstCoord = coordinates[0].geometry[0];
    initializeMap(firstCoord);

    // Add initial polygon
    const colorIndex = 0;
    currentPolygon = L.polygon(TimeMachine[coordinates[0].version], {
        color: colorPalette[colorIndex],
        fillColor: colorPalette[colorIndex],
        fillOpacity: 0.4,
        weight: 3
    }).addTo(map);

    // Initialize slider
    initializeSlider();

    // Initialize history display
    updateHistory(0);
}

/**
 * Handle form submission
 */
async function handleSubmit(event) {
    event.preventDefault();

    hideError();

    const wayId = wayIdInput.value;

    // Validate input
    const validation = validateWayId(wayId);
    if (!validation.valid) {
        showError(validation.error);
        return;
    }

    // Show loading
    showLoading();

    // Fetch data
    const result = await fetchWayHistory(validation.wayId);

    hideLoading();

    if (!result.success) {
        showError(result.error);
        return;
    }

    // Process data
    coordinates = processWayData(result.data);

    if (coordinates.length === 0) {
        showError(
            `No way data found for ID ${validation.wayId}. ` +
            `This might not be a valid way, or it might be a node or relation instead.`
        );
        return;
    }

    // Display data
    displayWayData(validation.wayId);

    // Update URL without page reload
    const url = new URL(window.location);
    url.searchParams.set('way', validation.wayId);
    window.history.pushState({}, '', url);
}

/**
 * Load way from URL parameter on page load
 */
function loadFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const wayId = urlParams.get('way');

    if (wayId) {
        wayIdInput.value = wayId;
        handleSubmit({ preventDefault: () => { } });
    }
}

// Event listeners
searchForm.addEventListener('submit', handleSubmit);

// Load from URL on page load
window.addEventListener('DOMContentLoaded', loadFromURL);
