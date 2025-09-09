let currentStepIndex = 0;
let stepsData = []; // gefüllt nach OSRM-Request

const iconMap = {
    'depart': 'start.svg',
    'arrive': 'destination.svg',
    'turn-left': 'turn_left.svg',
    'turn-right': 'turn_right.svg',
    'turn-slight-left': 'turn_left_slight.svg',
    'turn-slight-right': 'turn_right_slight.svg',
    'turn-sharp-left': 'turn_left_sharp.svg',
    'turn-sharp-right': 'turn_right_sharp.svg',
    'straight': 'straight.svg',
    'fork-left': 'fork_left.svg',
    'fork-right': 'fork_right.svg',
    'ramp-left': 'ramp_left.svg',
    'roundabout-left': 'roundabout_left.svg',
    'roundabout-right': 'roundabout_right.svg',
    'end of road-left': 'turn_left.svg',
    'end of road-right': 'turn_right.svg',
    'end of road-straight': 'straight.svg'
};

function getIconForStep(step) {
    step = step.stepData;
    let key = step.maneuver.type;
    const modifier = step.maneuver.modifier;

    if (modifier && key != "depart" && key != "arrive") {
        key += '-' + modifier.toLowerCase();
    }

    // Falls kein Match, fallback auf 'straight'
    return `../images/icons/maps_instructions/${iconMap[key] || iconMap['straight']}`;
}

function startNavigation(routeData) {
    stepsData = routeData.routes[0].legs[0].steps
        // Schritt "Straßenname wechselt zu" komplett rausfiltern
        .filter(step => step.maneuver.type !== 'new name')
        .map((step) => ({
            location: {
                lat: step.maneuver.location[1],
                lon: step.maneuver.location[0]
            },
            instruction: buildGermanInstruction(step),
            stepData: step
        }));

    currentStepIndex = 0;
    showInstruction(currentStepIndex);

    navigator.geolocation.watchPosition(onLocationUpdate, console.error, {
        enableHighAccuracy: true,
        maximumAge: 1000
    });
}

function onLocationUpdate(position) {
    const userPos = {
        lat: position.coords.latitude,
        lon: position.coords.longitude
    };

    // Route hinter Marker entfernen
    if (fullRouteCoords.length > 0 && map_elem && map_elem.getSource('route')) {
        // Finde nächsten Punkt auf der Route
        let minDist = Infinity;
        let closestIndex = 0;

        for (let i = 0; i < fullRouteCoords.length; i++) {
            const dist = haversineDistance(
                { lat: userPos.lat, lon: userPos.lon },
                { lat: fullRouteCoords[i][1], lon: fullRouteCoords[i][0] }
            );
            if (dist < minDist) {
                minDist = dist;
                closestIndex = i;
            }
        }

        const remainingCoords = fullRouteCoords.slice(closestIndex);

        map_elem.getSource('route').setData({
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: remainingCoords
            }
        });
    }

    if (currentStepIndex >= stepsData.length) return;

    const step = stepsData[currentStepIndex];
    const dist = haversineDistance(userPos, step.location);

    if (dist < 20) { // 20m vor Manöver
        currentStepIndex++;
        if (currentStepIndex < stepsData.length) {
            showInstruction(currentStepIndex);
        } else {
            console.log("Navigation beendet");
        }
    }

    if (usermarker) {
        usermarker.setLngLat(userPos);
    }
}

function startSmoothTracking() {
    function animateMarker() {
        if (currentPos && targetPos) {
            // Schrittweise Richtung Ziel bewegen (0.1 = 10% pro Frame)
            currentPos[0] += (targetPos[0] - currentPos[0]) * 0.1;
            currentPos[1] += (targetPos[1] - currentPos[1]) * 0.1;

            if (usermarker) {
                usermarker.setLngLat(currentPos);
            }

            if (map_elem && mapInitialized) {
                map_elem.easeTo({
                    center: currentPos,
                    duration: 500, // 0.5 Sek. sanftes Nachziehen
                    essential: true
                });
            }
        }
        animationFrame = requestAnimationFrame(animateMarker);
    }
    animationFrame = requestAnimationFrame(animateMarker);
}


// Hilfsfunktion: Distanz in Metern
function haversineDistance(a, b) {
    const R = 6371000;
    const toRad = deg => deg * Math.PI / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lon - a.lon);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);

    const h = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) *
        Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
}

function showInstruction(index) {
    document.querySelector(".route-navigation-instruction").textContent = stepsData[index].instruction;
    const iconPath = getIconForStep(stepsData[index]);
    document.querySelector(".route-navigation-icon").src = iconPath;
}

function getStreetName(step) {
    if (step.name) return step.name;
    if (step.ref) return step.ref;
    if (step.destinations) return step.destinations;
    return 'Unbekannte Straße';
}

function buildGermanInstruction(step) {
    const { type, modifier, exit } = step.maneuver;
    const street = getStreetName(step);
    const ref = step.ref ? ` (${step.ref})` : '';
    const destination = step.destinations ? ` Richtung ${step.destinations}` : '';

    switch (type) {
        case 'depart':
            return `Starten auf ${street}${ref}`;
        case 'arrive':
            return `Ankunft bei ${street || 'Ziel'}`;
        case 'turn':
            return `${modifier === 'right' ? 'Rechts' :
                modifier === 'left' ? 'Links' :
                    modifier === 'straight' ? 'Geradeaus' : 'Abbiegen'} auf ${street}${ref}${destination}`;
        case 'merge':
            return `Einfädeln auf ${street}${ref}${destination}`;
        case 'ramp':
            return `Abfahrt nehmen auf ${street}${ref}${destination}`;
        case 'roundabout':
            return `Im Kreisverkehr die ${exit}. Ausfahrt nehmen auf ${street}${ref}${destination}`;
        case 'fork':
            return `${modifier === 'left' ? 'Links' : 'Rechts'} halten auf ${street}${ref}${destination}`;
        case 'continue':
            return `Weiter auf ${street}${ref}${destination}`;
        case 'end of road':
            return `Am Ende der Straße ${modifier === 'right' ? 'rechts' : modifier === 'left' ? 'links' : ''} abbiegen auf ${street}${ref}${destination}`;
        case 'exit roundabout':
            return `Kreisverkehr verlassen auf ${street}${ref}${destination}`;
        case 'new name':
            return `Straßenname wechselt zu ${street}${ref}`;
        default:
            return `${type} auf ${street}${ref}${destination}`;
    }
}

function extractRouteGerman(osrmData) {
    const legs = osrmData.routes[0].legs;
    return legs.map((leg) => {
        const steps = leg.steps.map((step) => ({
            ...step,
            germanInstruction: buildGermanInstruction(step)
        }));

        return {
            start: steps[0].germanInstruction,
            steps: steps.slice(1, -1).map(s => s.germanInstruction),
            end: steps[steps.length - 1].germanInstruction
        };
    });
}

/* Fetch search results for locations while typing in search field with class search-input */
document.querySelectorAll('.search-input').forEach(input => {
    let timeout = null;
    input.addEventListener('input', () => {
        clearTimeout(timeout);
        const query = input.value.trim();
        if (query.length < 1) {
            document.querySelector('.search-results').style.display = 'none';
            document.querySelector('.pinned-destinations').style.display = "flex";
            return;
        } else {
            document.querySelector('.search-results').style.display = 'block';
            document.querySelector('.pinned-destinations').style.display = "none";
        }
        timeout = setTimeout(() => {
            fetch(`/api/search?q=${encodeURIComponent(query)}&limit=5`)
                .then(res => res.json())
                .then(data => {
                    const resultsContainer = document.querySelector('.search-results');
                    resultsContainer.innerHTML = '';
                    data.results.forEach(loc => {
                        const item = document.createElement('div');
                        item.className = 'pinned-destination';
                        item.classList.add('search-result-destination');
                        item.dataset.latitude = loc.lat;
                        item.dataset.longitude = loc.lon;
                        const addr = loc.raw.address;
                        let shortAddress = '';

                        if (addr) {
                            const street = addr.road || '';
                            const houseNumber = addr.house_number || '';
                            const villageOrTown = addr.village || addr.town || '';

                            if (street && houseNumber) {
                                shortAddress = `${street} ${houseNumber}`;
                            } else if (street) {
                                shortAddress = street;
                            } else if (houseNumber) {
                                shortAddress = houseNumber;
                            }

                            if (villageOrTown) {
                                shortAddress += `, ${villageOrTown}`;
                            }
                        }

                        // display name = name OR short haddress if name starts with number
                        const displayName = loc.name && !/^\d/.test(loc.name) ? loc.name : shortAddress || loc.display_name || 'Unbekannt';


                        // use different POI w following mapping: school, office: buildings.png, parking space: car.png, restaurant: food.png, fuelstation: gas.png, fallback: location.png
                        const poiType = loc.type || '';
                        let icon = 'location.png';
                        if (poiType.includes('school') || poiType.includes('university')) {
                            icon = 'buildings.png';
                        } else if (poiType.includes('office') || poiType.includes('company')) {
                            icon = 'buildings.png';
                        } else if (poiType.includes('parking')) {
                            icon = 'car.png';
                        } else if (poiType.includes('restaurant') || poiType.includes('cafe') || poiType.includes('bar')) {
                            icon = 'food.png';
                        } else if (poiType.includes('fuel') || poiType.includes('gas')) {
                            icon = 'gas.png';
                        } else {
                            icon = 'location.png';
                        }
                        item.innerHTML = `<img src="../images/icons/maps_places/${icon}" alt="POI Icon" class="pinned-destination-icon">
                            <span class="pinned-destination-text">${displayName}</span>`;
                        resultsContainer.appendChild(item);
                        item.addEventListener('click', async () => {
                            const destLng = parseFloat(item.dataset.longitude);
                            const destLat = parseFloat(item.dataset.latitude);

                            navigator.geolocation.getCurrentPosition(async position => {
                                const currentLng = position.coords.longitude;
                                const currentLat = position.coords.latitude;

                                const destinationCoords = [destLng, destLat];

                                // Route zeichnen
                                await drawRoute(map_elem, [currentLng, currentLat], destinationCoords);

                                const bounds = [
                                    [Math.min(currentLng, destLng), Math.min(currentLat, destLat)],
                                    [Math.max(currentLng, destLng), Math.max(currentLat, destLat)]
                                ]

                                const leftPad = 500;

                                map_elem.fitBounds(bounds, {
                                    padding: {
                                        top: 50,
                                        bottom: 50,
                                        left: leftPad,
                                        right: 50
                                    },
                                    maxZoom: 17
                                });

                                document.querySelector(".search-box").style.display = "none";
                                document.querySelector(".route-start-box").style.display = "flex";
                            });
                        });
                    });
                })
                .catch(err => {
                    console.error('Error fetching search results:', err);
                });
        }, 300); // Debounce by 300ms
    });
});