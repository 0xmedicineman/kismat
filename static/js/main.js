// Global variables
let map, stopsMap;
let userMarker;
let userLocation = null;
let routePolyline = null;
let stopMarkers = [];
let busStops = {};

// UI Elements
const loadingSpinner = document.querySelector('.loading-spinner');
const toast = document.querySelector('#notificationToast');
const routeError = document.querySelector('#routeError');
const mobileRouteError = document.querySelector('#mobileRouteError');

// Show/Hide Loading Spinner
function showLoading(message = 'Loading...') {
    loadingSpinner.querySelector('span').textContent = message;
    loadingSpinner.classList.add('active');
}

function hideLoading() {
    loadingSpinner.classList.remove('active');
}

// Show Toast Notification
function showToast(message, duration = 3000) {
    toast.textContent = message;
    toast.classList.add('active');
    setTimeout(() => {
        toast.classList.remove('active');
    }, duration);
}

// Show Error Message
function showError(message, isMobile = false) {
    const errorElement = isMobile ? mobileRouteError : routeError;
    errorElement.textContent = message;
    errorElement.classList.add('active');
    setTimeout(() => {
        errorElement.classList.remove('active');
    }, 5000);
}

// Clear Error Message
function clearError(isMobile = false) {
    const errorElement = isMobile ? mobileRouteError : routeError;
    errorElement.classList.remove('active');
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('KiSMAT - Smart Mobility and Transport initialized');
    // Initialize maps
    initMap();
    initStopsMap();
    
    // Initialize mobile tab navigation
    initMobileNavigation();
    
    // Set up event listeners
    document.getElementById('routeForm').addEventListener('submit', handleRouteSubmit);
    
    // Set up location tracking
    setupLocationTracking();
    
    // Load bus stops data
    loadBusStops();
    
    // Set up autocomplete for location inputs
    setupAutocomplete();
    
    // Mobile-specific enhancements
    initMobileEnhancements();
});

// Initialize the main map
function initMap() {
    try {
        showLoading('Initializing map...');
        // Create map centered on Dar es Salaam
        map = L.map('map').setView([-6.8235, 39.2695], 12);
        
        // Add tile layer (OpenStreetMap)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        
        // Add location control
        const locateControl = L.control.locate({
            position: 'topright',
            setView: 'untilPanOrZoom',
            flyTo: true,
            cacheLocation: true,
            icon: 'fa fa-location-arrow',
            iconLoading: 'fa fa-spinner fa-spin',
            showPopup: false,
            strings: {
                title: "Show my location"
            },
            locateOptions: {
                enableHighAccuracy: true
            }
        }).addTo(map);
        
        // Automatically try to locate user
        setTimeout(() => {
            locateControl.start();
        }, 1000);
        
        // Add event listener for location found
        map.on('locationfound', onLocationFound);
        
        hideLoading();
        showToast('Map initialized successfully');
    } catch (error) {
        console.error('Map initialization error:', error);
        hideLoading();
        showError('Failed to initialize map. Please refresh the page.');
    }
}

// Initialize the stops map
function initStopsMap() {
    // Create map centered on Dar es Salaam
    stopsMap = L.map('stopsMap').setView([-6.8235, 39.2695], 12);
    
    // Add tile layer (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(stopsMap);
    
    // Add location control
    const locateControl = L.control.locate({
        position: 'topright',
        setView: 'untilPanOrZoom',
        flyTo: true,
        cacheLocation: true,
        icon: 'fa fa-location-arrow',
        iconLoading: 'fa fa-spinner fa-spin',
        showPopup: false,
        strings: {
            title: "Show my location"
        },
        locateOptions: {
            enableHighAccuracy: true
        }
    }).addTo(stopsMap);
}

// Initialize mobile tab navigation
function initMobileNavigation() {
    const tabLinks = document.querySelectorAll('.mobile-bottom-nav-item');
    
    tabLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all links
            tabLinks.forEach(l => l.classList.remove('active'));
            
            // Add active class to clicked link
            this.classList.add('active');
            
            // Hide all tabs
            document.querySelectorAll('.mobile-tab-content > div').forEach(tab => {
                tab.classList.remove('active-tab');
            });
            
            // Show selected tab
            const tabId = this.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active-tab');
            
            // Refresh maps when tab is changed to fix rendering issues
            if (tabId === 'tab-journey') {
                setTimeout(() => {
                    map.invalidateSize();
                }, 100);
            } else if (tabId === 'tab-stops') {
                setTimeout(() => {
                    stopsMap.invalidateSize();
                }, 100);
            }
        });
    });
}

// Handle location found event
function onLocationFound(e) {
    userLocation = e.latlng;
    
    // Update or create user marker with pulse effect
    if (userMarker) {
        userMarker.setLatLng(userLocation);
    } else {
        const pulseIcon = L.divIcon({
            className: 'user-location-marker',
            html: '<div class="pulse"></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });
        
        userMarker = L.marker(userLocation, {
            icon: pulseIcon,
            zIndexOffset: 1000
        }).addTo(map);
        
        // Also add to stops map
        L.marker(userLocation, {
            icon: pulseIcon,
            zIndexOffset: 1000
        }).addTo(stopsMap);
    }
    
    // Find and display nearby stops
    findNearbyStops(userLocation);
}

// Set up location tracking
function setupLocationTracking() {
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(function(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            userLocation = L.latLng(lat, lng);
            
            // Trigger location found event
            const e = { latlng: userLocation };
            onLocationFound(e);
        });
    }
}

// Load bus stops data from the server
function loadBusStops() {
    try {
        showLoading('Loading bus stops...');
        fetch('/api/bus-stops')
            .then(response => response.json())
            .then(data => {
                busStops = data;
                addStopsToMap(data);
                hideLoading();
                showToast('Bus stops loaded successfully');
            })
            .catch(error => {
                console.error('Error loading bus stops:', error);
                hideLoading();
                showError('Failed to load bus stops. Please refresh the page.');
            });
    } catch (error) {
        console.error('Bus stops loading error:', error);
        hideLoading();
        showError('Failed to load bus stops. Please refresh the page.');
    }
}

// Add bus stops to both maps
function addStopsToMap(stops) {
    // Clear existing markers
    stopMarkers.forEach(marker => {
        map.removeLayer(marker);
        stopsMap.removeLayer(marker);
    });
    stopMarkers = [];
    
    // Create bus stop icon
    const busStopIcon = L.divIcon({
        className: 'bus-stop-icon',
        html: '<i class="fas fa-bus" style="color: #0066ff; font-size: 16px;"></i>',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });
    
    // Add markers for each stop
    Object.keys(stops).forEach(key => {
        const stop = stops[key];
        
        // Add to main map
        const marker = L.marker([stop.lat, stop.lng], {
            icon: busStopIcon
        }).addTo(map);
        
        marker.bindPopup(`
            <strong>${stop.name}</strong>
            <br>
            <button class="btn btn-sm btn-primary mt-2 set-from-btn" data-stop="${key}">Set as Origin</button>
            <button class="btn btn-sm btn-secondary mt-2 set-to-btn" data-stop="${key}">Set as Destination</button>
        `);
        
        marker.on('popupopen', function() {
            // Add event listeners to buttons
            document.querySelectorAll('.set-from-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const stopKey = this.getAttribute('data-stop');
                    document.getElementById('from').value = stops[stopKey].name;
                    marker.closePopup();
                });
            });
            
            document.querySelectorAll('.set-to-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const stopKey = this.getAttribute('data-stop');
                    document.getElementById('to').value = stops[stopKey].name;
                    marker.closePopup();
                });
            });
        });
        
        stopMarkers.push(marker);
        
        // Add to stops map
        const stopsMapMarker = L.marker([stop.lat, stop.lng], {
            icon: busStopIcon
        }).addTo(stopsMap);
        
        stopsMapMarker.bindPopup(`<strong>${stop.name}</strong>`);
        stopMarkers.push(stopsMapMarker);
    });
}

// Find nearby stops based on user location
function findNearbyStops(location) {
    if (!location || !busStops || Object.keys(busStops).length === 0) {
        return;
    }
    
    // Calculate distance to each stop and sort by distance
    const stopsWithDistance = Object.keys(busStops).map(key => {
        const stop = busStops[key];
        const distance = location.distanceTo(L.latLng(stop.lat, stop.lng));
        return {
            key: key,
            name: stop.name,
            distance: distance,
            lat: stop.lat,
            lng: stop.lng
        };
    }).sort((a, b) => a.distance - b.distance);
    
    // Take the 5 closest stops
    const nearbyStops = stopsWithDistance.slice(0, 5);
    
    // Update the nearby stops section
    const nearbyStopsContainer = document.getElementById('nearbyStops');
    nearbyStopsContainer.innerHTML = '';
    
    if (nearbyStops.length === 0) {
        nearbyStopsContainer.innerHTML = `
            <div class="text-center text-muted">
                <i class="fas fa-exclamation-circle fa-3x mb-3"></i>
                <p>No bus stops found nearby</p>
            </div>
        `;
        return;
    }
    
    // Create a list of nearby stops
    nearbyStops.forEach(stop => {
        const distanceInKm = (stop.distance / 1000).toFixed(1);
        const stopItem = document.createElement('div');
        stopItem.className = 'stop-item';
        stopItem.innerHTML = `
            <div>
                <div class="stop-item-name">${stop.name}</div>
                <div class="stop-item-distance">${distanceInKm} km away</div>
            </div>
            <span class="eta-badge">~${Math.round(stop.distance / 80)} min walk</span>
        `;
        
        // Add click event to set as origin
        stopItem.addEventListener('click', function() {
            document.getElementById('from').value = stop.name;
            
            // Switch to journey tab on mobile
            const journeyTabLink = document.querySelector('.mobile-bottom-nav-item[data-tab="tab-journey"]');
            if (journeyTabLink) {
                journeyTabLink.click();
            }
        });
        
        nearbyStopsContainer.appendChild(stopItem);
    });
}

// Handle route form submission
async function handleRouteSubmit(event) {
    event.preventDefault();
    clearError();
    
    const from = document.getElementById('from').value;
    const to = document.getElementById('to').value;
    const arrivalTime = document.getElementById('arrivalTime').value;
    
    if (!from || !to) {
        showError('Please enter both origin and destination');
        return;
    }
    
    try {
        showLoading('Finding the best route...');
        const routes = await fetchRoutes(from, to);
        
        if (routes.length === 0) {
            showError('No routes found between these locations');
            return;
        }
        
        displayRoutes(routes);
        showToast('Route found successfully!');
    } catch (error) {
        console.error('Route finding error:', error);
        showError('Failed to find route. Please try again.');
    } finally {
        hideLoading();
    }
}

// Display route on the map and in the results section
function displayRoute(routeData) {
    // Clear existing route
    if (routePolyline) {
        map.removeLayer(routePolyline);
    }
    
    // Extract coordinates for the route
    const routeCoordinates = routeData.stops.map(stop => [stop.lat, stop.lng]);
    
    // Create a polyline for the route
    routePolyline = L.polyline(routeCoordinates, {
        color: '#0066ff',
        weight: 5,
        opacity: 0.7
    }).addTo(map);
    
    // Fit the map to the route
    map.fitBounds(routePolyline.getBounds(), {
        padding: [50, 50]
    });
    
    // Update the route results section
    const routeResults = document.getElementById('routeResults');
    
    // Calculate total time in minutes
    const totalTimeMinutes = routeData.stops.length * 5; // Simplified calculation
    
    routeResults.innerHTML = `
        <div class="route-summary">
            <div class="route-summary-title">
                ${routeData.stops[0].name} to ${routeData.stops[routeData.stops.length - 1].name}
            </div>
            <div class="route-meta">
                <div class="route-meta-item">
                    <i class="fas fa-clock"></i> ${totalTimeMinutes} min
                </div>
                <div class="route-meta-item">
                    <i class="fas fa-map-marker-alt"></i> ${routeData.stops.length} stops
                </div>
                <div class="route-meta-item">
                    <i class="fas fa-bus"></i> Line ${routeData.line || 'Direct'}
                </div>
            </div>
        </div>
        <div class="route-stops">
            ${generateRouteStopsHTML(routeData.stops)}
        </div>
    `;
}

// Generate HTML for route stops
function generateRouteStopsHTML(stops) {
    let html = '';
    
    stops.forEach((stop, index) => {
        // Determine if this is the start or end stop
        const isStartStop = index === 0;
        const isEndStop = index === stops.length - 1;
        let stopClass = '';
        
        if (isStartStop) {
            stopClass = 'start-stop';
        } else if (isEndStop) {
            stopClass = 'end-stop';
        }
        
        // Calculate estimated time (simplified)
        const estimatedTime = new Date();
        estimatedTime.setMinutes(estimatedTime.getMinutes() + (index * 5));
        const timeString = estimatedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        html += `
            <div class="route-stop-item ${stopClass}">
                <div class="route-stop-marker">${index + 1}</div>
                <div class="route-stop-info">
                    <div class="route-stop-name">${stop.name}</div>
                    <div class="route-stop-eta">
                        ${isStartStop ? 'Departure' : isEndStop ? 'Arrival' : 'Estimated arrival'}: ${timeString}
                    </div>
                </div>
            </div>
        `;
    });
    
    return html;
}

// Calculate and display AI arrival planning
function calculateArrivalPlanning(routeData, arrivalTime) {
    // Parse the arrival time
    const [hours, minutes] = arrivalTime.split(':').map(Number);
    const arrivalDateTime = new Date();
    arrivalDateTime.setHours(hours, minutes, 0, 0);
    
    // Calculate journey components
    const journeyTimeMinutes = routeData.stops.length * 5; // Simplified calculation
    const walkTimeMinutes = 5; // Estimated time to walk to the first bus stop
    const waitTimeMinutes = 3; // Average wait time for the bus
    const bufferTimeMinutes = 5; // Buffer time for delays
    
    // Calculate total time needed before arrival
    const totalTimeNeeded = journeyTimeMinutes + walkTimeMinutes + waitTimeMinutes + bufferTimeMinutes;
    
    // Calculate departure time
    const departureDateTime = new Date(arrivalDateTime);
    departureDateTime.setMinutes(departureDateTime.getMinutes() - totalTimeNeeded);
    
    // Format departure time
    const departureTimeString = departureDateTime.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
    });
    
    // Update the AI planner section
    document.getElementById('arrivalPlanner').style.display = 'block';
    document.getElementById('suggestedDepartureTime').innerHTML = `Leave at <span>${departureTimeString}</span>`;
    document.getElementById('walkTime').textContent = `${walkTimeMinutes} min`;
    document.getElementById('waitTime').textContent = `${waitTimeMinutes} min`;
    document.getElementById('journeyTime').textContent = `${journeyTimeMinutes} min`;
    document.getElementById('bufferTime').textContent = `${bufferTimeMinutes} min`;
}

// Set up autocomplete for location inputs
function setupAutocomplete() {
    const fromInput = document.getElementById('from');
    const toInput = document.getElementById('to');
    const fromSuggestions = document.getElementById('fromSuggestions');
    const toSuggestions = document.getElementById('toSuggestions');
    
    // Function to show suggestions
    function showSuggestions(input, suggestionsContainer) {
        const query = input.value.toLowerCase();
        
        if (query.length < 2 || !busStops || Object.keys(busStops).length === 0) {
            suggestionsContainer.innerHTML = '';
            return;
        }
        
        // Filter stops based on query
        const matchingStops = Object.keys(busStops)
            .filter(key => busStops[key].name.toLowerCase().includes(query))
            .map(key => busStops[key]);
        
        // Generate suggestions HTML
        suggestionsContainer.innerHTML = '';
        
        if (matchingStops.length === 0) {
            suggestionsContainer.style.display = 'none';
            return;
        }
        
        matchingStops.slice(0, 5).forEach(stop => {
            const suggestion = document.createElement('div');
            suggestion.className = 'suggestion-item';
            suggestion.textContent = stop.name;
            
            suggestion.addEventListener('click', function() {
                input.value = stop.name;
                suggestionsContainer.innerHTML = '';
                suggestionsContainer.style.display = 'none';
            });
            
            suggestionsContainer.appendChild(suggestion);
        });
        
        suggestionsContainer.style.display = 'block';
    }
    
    // Add event listeners for input
    fromInput.addEventListener('input', () => showSuggestions(fromInput, fromSuggestions));
    toInput.addEventListener('input', () => showSuggestions(toInput, toSuggestions));
    
    // Hide suggestions when clicking outside
    document.addEventListener('click', function(e) {
        if (!fromInput.contains(e.target) && !fromSuggestions.contains(e.target)) {
            fromSuggestions.style.display = 'none';
        }
        
        if (!toInput.contains(e.target) && !toSuggestions.contains(e.target)) {
            toSuggestions.style.display = 'none';
        }
    });
}

// Mobile-specific enhancements
function initMobileEnhancements() {
    // Pull to refresh functionality
    let touchStartY = 0;
    let pullStarted = false;

    document.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
        const touchY = e.touches[0].clientY;
        const scroll = window.scrollY;
        
        if (scroll === 0 && touchY > touchStartY && !pullStarted) {
            pullStarted = true;
            showToast('Pull down to refresh...', 1000);
        }
    }, { passive: true });

    document.addEventListener('touchend', () => {
        if (pullStarted && window.scrollY === 0) {
            showLoading('Refreshing...');
            window.location.reload();
        }
        pullStarted = false;
    }, { passive: true });

    // Prevent double-tap zoom on buttons
    document.querySelectorAll('.btn, .mobile-bottom-nav-item').forEach(element => {
        element.addEventListener('touchend', (e) => {
            e.preventDefault();
        }, { passive: false });
    });
}
