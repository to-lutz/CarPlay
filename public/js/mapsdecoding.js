let currentStepIndex = 0;
let stepsData = []; // gefüllt nach OSRM-Request

function startNavigation(routeData) {
    // Schritte extrahieren
    stepsData = routeData.routes[0].legs[0].steps.map((step) => ({
        location: {
            lat: step.maneuver.location[1],
            lon: step.maneuver.location[0]
        },
        instruction: buildGermanInstruction(step)
    }));

    currentStepIndex = 0;
    showInstruction(currentStepIndex);

    // Standortüberwachung starten
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
    console.log(stepsData[index]);
    document.querySelector(".route-navigation-instruction").textContent = stepsData[index].instruction;
    // TODO: icon aktualisieren
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