let map_elem;
let selected_route_data;
let currentPos = null;
let targetPos = null;
let animationFrame;
let mapInitialized = false;
let usermarker;
let fullRouteCoords = [];

function updateClock() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    document.getElementById('time-sidebar').textContent = `${hours}:${minutes}`;
}

updateClock();
setInterval(updateClock, 1000); // Update every second

const appicons = document.querySelectorAll('.app-icon');
appicons.forEach((el) => {
    el.addEventListener('click', () => {
        el.classList.add('clicked');

        setTimeout(() => {
            el.classList.remove('clicked');
        }, 300);
    });
});

if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("../js/serviceworker.js");
}

document.querySelectorAll('.app').forEach(icon => {
    icon.addEventListener('click', () => {
        let appName = icon.id;
        if (appName != "siri") openApp(appName);
    });
});

document.querySelectorAll('.app-big').forEach(icon => {
    icon.addEventListener('click', () => {
        let appName = icon.id;
        if (appName != "siri") openApp(appName);
    });
});

function handleSiriStart() {
    document.querySelector('#siri-border').classList.add('siri-border');
}

function handleSiriStop() {
    if (document.querySelector('.siri-border')) {
        document.querySelector('#siri-border').classList.remove('siri-border');
    }
}

let siriButton = document.querySelector('#siri');

siriButton.addEventListener('mousedown', handleSiriStart);
siriButton.addEventListener('touchstart', handleSiriStart);

siriButton.addEventListener('mouseup', handleSiriStop);
siriButton.addEventListener('mouseleave', handleSiriStop);
siriButton.addEventListener('touchend', handleSiriStop);
siriButton.addEventListener('touchcancel', handleSiriStop);

document.querySelector('.time-battery-wrapper').addEventListener('click', () => {
    closeApp();
});

function fetchAndDisplayPlaylists() {
    fetch('/playlists')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            const playlistsContainer = document.querySelector('.app-music-home-playlist-container');
            playlistsContainer.innerHTML = ''; // Clear existing content

            if (data.items && data.items.length > 0) {
                data.items.forEach(playlist => {
                    const playlistElement = document.createElement('div');
                    playlistElement.className = 'app-music-home-playlist';
                    playlistElement.innerHTML = `
            <div class="playlist-card" id="${playlist.id}">
                <img src="${playlist.images[0]?.url || 'default-image-url.jpg'}" 
                     alt="${playlist.name}" 
                     class="playlist-image">
                <h3 class="playlist-name">${playlist.name}</h3>
            </div>
        `;
                    playlistElement.addEventListener('click', (event) => {
                        // Hide home screen
                        document.querySelector('.app-music-home').style.display = 'none';
                        document.querySelector('.app-music-home').style.visibility = 'hidden';
                        // Show playlist view
                        document.querySelector('.app-music-playlist').style.display = 'flex';
                        document.querySelector('.app-music-playlist').style.visibility = 'visible';
                        document.querySelector('.app-music-playlist-name').textContent = playlist.name;
                        // Fetch and display playlist tracks
                        fetch(`/playlists/${playlist.id}/tracks`)
                            .then(response => {
                                if (!response.ok) {
                                    throw new Error(`HTTP error! status: ${response.status}`);
                                }
                                return response.json();
                            })
                            .then(tracksData => {
                                const tracksContainer = document.querySelector('.app-music-playlist-wrapper');
                                tracksContainer.innerHTML = ''; // Clear existing tracks

                                const shuffleElement = document.createElement('div');
                                shuffleElement.className = 'app-music-playlist-element';
                                shuffleElement.innerHTML = `
                        <img src="../images/icons/shuffle.png" class="app-music-playlist-cover-shuffle">
                        <div class="app-music-playlist-info">
                            <span class="app-music-playlist-track-name">Zufällige Wiedergabe</span>
                        </div>
                    `;
                                shuffleElement.addEventListener('click', () => {
                                    // Start shuffled playlist
                                    fetch(`/playlists/${playlist.id}/shuffle`, {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json'
                                        }
                                    })
                                        .then(response => {
                                            if (!response.ok) {
                                                throw new Error(`HTTP error! status: ${response.status}`);
                                            }
                                            return response.json();
                                        })
                                        .then(() => {
                                            refreshTrack();
                                            openPlayerView();
                                        })
                                        .catch(error => {
                                            console.error('Error starting shuffled playlist:', error);
                                        });
                                });

                                let dividerElement = document.createElement('hr');
                                dividerElement.classList.add("app-music-playlist-divider");

                                tracksContainer.appendChild(dividerElement);
                                tracksContainer.appendChild(shuffleElement);


                                if (tracksData.items && tracksData.items.length > 0) {
                                    tracksData.items.forEach(track => {
                                        let dividerElement = document.createElement('hr');
                                        dividerElement.classList.add("app-music-playlist-divider");
                                        tracksContainer.appendChild(dividerElement);
                                        const trackElement = document.createElement('div');
                                        trackElement.className = 'app-music-playlist-element';
                                        trackElement.innerHTML = `
                            <img src="${track.track.album.images[0]?.url || 'default-image-url.jpg'}" 
                                 alt="${track.track.name}" 
                                 class="app-music-playlist-cover">
                            <div class="app-music-playlist-info">
                                <span class="app-music-playlist-track-name">${track.track.name} 
                                    ${track.track.explicit ? '<span class="explicit-badge" aria-hidden="false">E</span>' : ''}
                                </span>
                                <span class="app-music-playlist-track-artist">${track.track.artists.map(artist => artist.name).join(', ')}</span>
                            </div>
                        `;
                                        trackElement.addEventListener('click', () => {
                                            // Start playback of the selected track
                                            fetch(`/playlists/${playlist.id}/playTrack`, {
                                                method: 'POST',
                                                headers: {
                                                    'Content-Type': 'application/json'
                                                },
                                                body: JSON.stringify({ trackUri: track.track.uri })
                                            })
                                                .then(response => {
                                                    if (!response.ok) {
                                                        throw new Error(`HTTP error! status: ${response.status}`);
                                                    }
                                                    return response.json();
                                                })
                                                .then(() => {
                                                    refreshTrack(); // Refresh the current track display
                                                })
                                                .catch(error => {
                                                    console.error('Error playing track from playlist:', error);
                                                });
                                            // Show player view
                                            openPlayerView();
                                        });

                                        tracksContainer.appendChild(trackElement);
                                    });
                                }
                            });
                    });
                    playlistsContainer.appendChild(playlistElement);
                });
            } else {
                playlistsContainer.innerHTML = '<h1>No playlists found</h1>';
            }
        })
        .catch(error => {
            console.error('Error fetching playlists:', error);
            document.querySelector('.app-music-home-playlists').innerHTML = `
                <h1>Error fetching playlists</h1>
            `;
        });
}

document.querySelector('#app-music-header-startpage').addEventListener('click', () => {
    openMusicAppPage('start');
});

document.querySelector('#app-music-header-search').addEventListener('click', () => {
    openMusicAppPage('search');
});

document.querySelector('#app-music-header-library').addEventListener('click', () => {
    openMusicAppPage('library');
});

// Swipe Animation
let startX = 0;

document.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
});

document.addEventListener('touchend', (e) => {
    const endX = e.changedTouches[0].clientX;
    const diffX = endX - startX;

    if (Math.abs(diffX) > 50) { // 50px
        if (diffX > 0) {
            // Swipe to right - prev page
            if (document.querySelector('.app-music-player').style.display !== 'none') {
                document.querySelector('.app-music-home').style.display = 'flex';
                document.querySelector('.app-music-home').style.visibility = 'visible';

                document.querySelector('.app-music-player').style.display = 'none';
                document.querySelector('.app-music-player').style.visibility = 'hidden';
                document.querySelector('.app-music-wrapper').style.display = 'none';
                document.querySelector('.app-music-wrapper').style.visibility = 'hidden';
                // Hide album cover
                document.querySelector('.music-album-background').style.display = 'none';
                document.querySelector('.music-album-background').style.visibility = 'hidden';
                // Hide back button
                document.querySelector('.back-button').style.visibility = 'hidden';
                // Show playing button
                document.querySelector('.playing-button').style.visibility = 'visible';
                // Fetch playlists and display them
                fetchAndDisplayPlaylists();
            } else if (document.querySelector('.app-music-home').style.display === 'flex') {
                if (document.querySelector('.app-music-home-search').style.display === 'flex') {
                    openMusicAppPage('start');
                } else if (document.querySelector('.app-music-home-library').style.display === 'flex') {
                    openMusicAppPage('search');
                }
            }
        } else {
            // Swipe to left - next page
            if (document.querySelector('.app-music-home').style.display === 'flex') {
                if (document.querySelector('.app-music-home-start').style.display === 'flex') {
                    openMusicAppPage('search');
                } else if (document.querySelector('.app-music-home-search').style.display === 'flex') {
                    openMusicAppPage('library');
                }
            }
        }
    }
});

function openMusicAppPage(page) {
    if (document.querySelector('.app-music').style.display === 'flex') {
        document.querySelector('.app-music-home-start').style.display = 'none';
        document.querySelector('.app-music-home-start').style.visibility = 'hidden';
        document.querySelector('.app-music-home-search').style.display = 'none';
        document.querySelector('.app-music-home-search').style.visibility = 'hidden';
        document.querySelector('.app-music-home-library').style.display = 'none';
        document.querySelector('.app-music-home-library').style.visibility = 'hidden';
        document.querySelector('#app-music-header-startpage').classList.remove('active');
        document.querySelector('#app-music-header-search').classList.remove('active');
        document.querySelector('#app-music-header-library').classList.remove('active');

        switch (page) {
            case 'start':
                document.querySelector('.app-music-home-start').style.display = 'flex';
                document.querySelector('.app-music-home-start').style.visibility = 'visible';
                document.querySelector('#app-music-header-startpage').classList.add('active');
                break;
            case 'search':
                document.querySelector('.app-music-home-search').style.display = 'flex';
                document.querySelector('.app-music-home-search').style.visibility = 'visible';
                document.querySelector('#app-music-header-search').classList.add('active');
                break;
            case 'library':
                document.querySelector('.app-music-home-library').style.display = 'flex';
                document.querySelector('.app-music-home-library').style.visibility = 'visible';
                document.querySelector('#app-music-header-library').classList.add('active');
                break;
        }
    }
}

document.querySelectorAll('.back-button').forEach(e => e.addEventListener('click', () => {
    // If in music app, go back to the home screen of the music app
    if (document.querySelector('.app-music').style.display === 'flex') {
        // Check if in playlist view
        if (document.querySelector('.app-music-playlist').style.display === 'flex') {
            document.querySelector('.app-music-playlist').style.display = 'none';
            document.querySelector('.app-music-playlist').style.visibility = 'hidden';
            // Show home screen
            document.querySelector('.app-music-home').style.display = 'flex';
            document.querySelector('.app-music-home').style.visibility = 'visible';
            return;
        }
        document.querySelector('.app-music-home').style.display = 'flex';
        document.querySelector('.app-music-home').style.visibility = 'visible';

        document.querySelector('.app-music-player').style.display = 'none';
        document.querySelector('.app-music-player').style.visibility = 'hidden';
        document.querySelector('.app-music-wrapper').style.display = 'none';
        document.querySelector('.app-music-wrapper').style.visibility = 'hidden';
        // Hide album cover
        document.querySelector('.music-album-background').style.display = 'none';
        document.querySelector('.music-album-background').style.visibility = 'hidden';
        // Hide back button
        document.querySelector('.back-button').style.visibility = 'hidden';
        // Show playing button
        document.querySelector('.playing-button').style.visibility = 'visible';
        // Fetch playlists and display them
        fetchAndDisplayPlaylists();
    }
}));

document.querySelector('.playing-button').addEventListener('click', () => {
    // If in music app, go to the player view
    if (document.querySelector('.app-music').style.display === 'flex') {
        openPlayerView();
    }
});

function openPlayerView() {
    document.querySelector('.app-music-home').style.display = 'none';
    document.querySelector('.app-music-home').style.visibility = 'hidden';
    document.querySelector('.app-music-playlist').style.display = 'none';
    document.querySelector('.app-music-playlist').style.visibility = 'hidden';
    document.querySelector('.app-music-player').style.display = 'flex';
    document.querySelector('.app-music-player').style.visibility = 'visible';
    document.querySelector('.app-music-wrapper').style.display = 'flex';
    document.querySelector('.app-music-wrapper').style.visibility = 'visible';
    // Show album cover
    document.querySelector('.music-album-background').style.display = 'block';
    document.querySelector('.music-album-background').style.visibility = 'visible';
    // Show back button
    document.querySelector('.back-button').style.visibility = 'visible';
    // Hide playing button
    document.querySelector('.playing-button').style.visibility = 'hidden';
}

function openApp(appName) {
    closeApp(); // Close any open app first
    document.querySelector('.open-app-overlay').style.display = 'flex';
    document.querySelector('.open-app-overlay').style.visibility = 'visible';
    document.querySelector('.main-page').style.display = 'none';
    document.querySelector('.main-page').style.visibility = 'hidden';
    switch (appName) {
        case 'music':
            document.querySelector('.app-music').style.display = 'flex';
            document.querySelector('.app-music').style.visibility = 'visible';
            startMusicApp();
            break;
        case 'maps':
            initCompass();
            document.querySelector('.app-maps').style.display = 'flex';
            document.querySelector('.app-maps').style.visibility = 'visible';

            if ('geolocation' in navigator) {
                navigator.geolocation.watchPosition(
                    (position) => {
                        const lng = position.coords.longitude;
                        const lat = position.coords.latitude;

                        if (!map_elem) {
                            // Initialisiere Karte nur beim allerersten Positions-Callback
                            const map = new maplibregl.Map({
                                container: 'map',
                                style: '/stylesheets/applemaps.json',
                                center: [lng, lat],
                                zoom: 12
                            });

                            map_elem = map;
                            map.addControl(new maplibregl.NavigationControl());

                            map.once('load', () => {
                                const leftPad = Math.min(500, window.innerWidth * 0.4);
                                map.flyTo({
                                    center: [lng, lat],
                                    zoom: 17,
                                    essential: true,
                                    offset: [leftPad / 2, 0]
                                });

                                const markerEl = document.createElement('div');
                                markerEl.classList.add('app-maps-marker');
                                markerEl.innerHTML = `<svg class="app-maps-marker-svg" width="17" height="17" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="transform: rotate(-45deg);">
                        <path d="M12 2 L19 20 L12 16 L5 20 Z" fill="white" stroke="white" stroke-width="2" stroke-linejoin="round"/>
                        <path d="M12 2 L19 20 L12 16 L5 20 Z" fill="none" stroke="white" stroke-width="2.5" stroke-linejoin="round"/>
                    </svg>`;

                                usermarker = new maplibregl.Marker({ element: markerEl })
                                    .setLngLat([lng, lat])
                                    .addTo(map);
                            });

                            document.querySelectorAll('.pinned-destination').forEach(el => {
                                el.addEventListener('click', async () => {
                                    const destLng = parseFloat(el.dataset.longitude);
                                    const destLat = parseFloat(el.dataset.latitude);

                                    navigator.geolocation.getCurrentPosition(async position => {
                                        const currentLng = position.coords.longitude;
                                        const currentLat = position.coords.latitude;

                                        const destinationCoords = [destLng, destLat];

                                        // Route zeichnen
                                        await drawRoute(map, [currentLng, currentLat], destinationCoords);

                                        const bounds = [
                                            [Math.min(currentLng, destLng), Math.min(currentLat, destLat)],
                                            [Math.max(currentLng, destLng), Math.max(currentLat, destLat)]
                                        ]

                                        const leftPad = 500;

                                        map.fitBounds(bounds, {
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

                        } else {
                            // Falls Karte schon existiert → Marker updaten
                            if (usermarker) {
                                usermarker.setLngLat([lng, lat]);
                            }
                        }
                    },
                    (error) => {
                        alert('Geolocation-Fehler:' + error.code + ' - ' + error.message);
                    },
                    {
                        enableHighAccuracy: true,
                        timeout: 5000,
                        maximumAge: 0
                    }
                    , console.error, {
                    enableHighAccuracy: true,
                    maximumAge: 1000
                });
            } else {
                alert('Geolocation wird nicht unterstützt');
            }
    }
}

document.querySelector(".route-start-header-close").addEventListener("click", (e) => {
    document.querySelector(".search-box").style.display = "flex";
    document.querySelector(".route-start-box").style.display = "none";

    if (map_elem.getSource('route')) {
        map_elem.removeLayer('route-outline');
        map_elem.removeLayer('route');
        map_elem.removeSource('route');
    }

    if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition((position) => {
            const lng = position.coords.longitude;
            const lat = position.coords.latitude;

            const leftPad = Math.min(500, window.innerWidth * 0.4);

            map_elem.flyTo({
                center: [lng, lat],
                zoom: 17,
                essential: true,
                offset: [leftPad / 2, 0]  // Verschiebe das Ziel um die Hälfte der linken UI Breite nach rechts
            });
        });
    }

});

document.querySelector(".selected-route-start-button").addEventListener("click", (e) => {
    document.querySelector(".route-start-box").style.display = "none";
    document.querySelector(".route-navigation-box-wrapper").style.display = "flex";
    // Zoom to driver
    if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition((position) => {
            const lng = position.coords.longitude;
            const lat = position.coords.latitude;

            const leftPad = Math.min(500, window.innerWidth * 0.4);

            map_elem.flyTo({
                center: [lng, lat],
                zoom: 17,
                essential: true,
                offset: [leftPad / 2, 0]  // Verschiebe das Ziel um die Hälfte der linken UI Breite nach rechts
            });
        });
    }
    startNavigation(selected_route_data);
});

async function getRoute(start, end) {
    const url = `https://router.project-osrm.org/route/v1/driving/${start[0]},${start[1]};${end[0]},${end[1]}?overview=full&geometries=geojson&steps=true`;
    const response = await fetch(url);
    const json = await response.json();
    selected_route_data = json;
    return json.routes[0];
}


async function drawRoute(map, start, end) {
    const route = await getRoute(start, end);

    fullRouteCoords = route.geometry.coordinates;

    // Set time to travel, ETA, distance
    const durationMinutes = Math.round(route.duration / 60);
    const distanceKm = (route.distance / 1000).toFixed(0);
    const eta = new Date(Date.now() + route.duration * 1000);
    const etaStr = eta.toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });

    document.querySelector("#selected-route-time-var").textContent = durationMinutes + " Min.";
    document.querySelector("#selected-route-eta-distance-var").textContent = etaStr + " ETA | " + distanceKm + " km";

    const routeGeoJSON = route.geometry;

    if (map.getSource('route')) {
        map.removeLayer('route-outline');
        map.removeLayer('route');
        map.removeSource('route');
    }

    map.addSource('route', {
        type: 'geojson',
        data: {
            type: 'Feature',
            geometry: routeGeoJSON
        }
    });

    map.addLayer({
        id: 'route-outline',
        type: 'line',
        source: 'route',
        layout: {
            'line-join': 'round'
        },
        paint: {
            'line-color': '#349DFE',
            'line-width': 12
        }
    });


    map.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        paint: {
            'line-color': '#0072F7',
            'line-width': 8
        }
    });
}

function initCompass() {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then(response => {
                if (response === 'granted') {
                    addOrientationListener();
                } else {
                    console.warn('Zugriff auf Sensoren abgelehnt');
                }
            })
            .catch(console.error);
    } else {
        addOrientationListener();
    }
}


let orientationOffset = 90;
// Listener hinzufügen
function addOrientationListener() {
    window.addEventListener('deviceorientation', (event) => {
        const alpha = event.webkitCompassHeading || event.alpha; // iOS/Android
        if (alpha !== null && alpha !== undefined) {
            const rotation = (event.webkitCompassHeading)
                ? (alpha + orientationOffset) % 360
                : (360 - alpha + orientationOffset) % 360;
            let markerEl = document.querySelector(".app-maps-marker-svg");
            markerEl.style.transform = `rotate(${rotation}deg)`;
        }
    });
}

function closeApp() {
    document.querySelector('.open-app-overlay').style.display = 'none';
    document.querySelector('.open-app-overlay').style.visibility = 'hidden';
    document.querySelector('.main-page').style.display = 'flex';
    document.querySelector('.main-page').style.visibility = 'visible';
    // Close all apps
    document.querySelector('.app-music').style.display = 'none';
    document.querySelector('.app-music').style.visibility = 'hidden';
    document.querySelector('.app-maps').style.display = 'none';
    document.querySelector('.app-maps').style.visibility = 'hidden';
}

async function startMusicApp() {
    refreshTrack();
    // Refresh the current track display every 1s
    setInterval(refreshTrack, 1000);
}

async function refreshTrack() {
    try {
        const response = await fetch('/getCurrentTrack');

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data && data.item) {
            const item = data.item;

            const songName = item.name;
            const albumName = item.album.name;
            let albumImage = null;
            if (item.album.images[0] != undefined) albumImage = item.album.images[0].url;
            const artists = item.artists.map(artist => artist.name).join(', ');
            const isPlaying = data.is_playing;

            // Fetch for possible album cover for no album cover
            if (albumImage == null) {
                let fetchedImage = await fetchAlbumImage(albumName, artists.split(',')[0]);
                if (fetchedImage != null) albumImage = fetchedImage;
            }

            document.querySelector('.music-album-background').src = albumImage;
            if (albumImage != null) {
                document.querySelector('.app-music-right').style.display = "flex";
                document.querySelector('.music-album-background').style.display = "block";
                document.querySelector('.music-album-cover').style.display = "block";
                document.querySelector('.music-album-cover').src = albumImage;
            }
            else {
                document.querySelector('.app-music-right').style.display = "none";
                document.querySelector('.music-album-cover').style.display = "none";
                document.querySelector('.music-album-background').style.display = "none";
            }
            document.querySelector('#song-name').textContent = songName;
            document.querySelector('#album-name').textContent = albumName;
            document.querySelector('#artist-names').textContent = artists;
            if (isPlaying) {
                document.querySelector('.music-control-play-pause').classList.remove('fa-play');
                document.querySelector('.music-control-play-pause').classList.add('fa-pause');
            } else {
                document.querySelector('.music-control-play-pause').classList.remove('fa-pause');
                document.querySelector('.music-control-play-pause').classList.add('fa-play');
            }
            // Update progress bar
            const progress = data.progress_ms || 0;
            const duration = item.duration_ms || 0;
            const progressBar = document.getElementById('progress-bar');
            const currentTime = document.getElementById('current-time');
            const durationElement = document.getElementById('duration');

            progressBar.style.width = `${(progress / duration) * 100}%`;
            currentTime.textContent = new Date(progress).toISOString().substr(14, 5);
            // Remaining duration in format -m:ss (ex: -2:50)
            const remainingTime = new Date(duration - progress).toISOString().substr(14, 5);
            durationElement.textContent = `-${remainingTime}`;
            // Show playing button if in music app and home screen
            if (document.querySelector('.app-music-home').style.display === 'flex' && document.querySelector('.app-music').style.display === 'flex') {
                document.querySelector('.playing-button').style.visibility = 'visible';
            }

        } else {
            // No track playing
            document.querySelector('.app-music-home').style.display = 'flex';
            document.querySelector('.app-music-home').style.visibility = 'visible';
            document.querySelector('.app-music-player').style.display = 'none';
            document.querySelector('.app-music-player').style.visibility = 'hidden';
            document.querySelector('.app-music-wrapper').style.display = 'none';
            document.querySelector('.app-music-wrapper').style.visibility = 'hidden';
            // Hide album cover
            document.querySelector('.music-album-background').style.display = 'none';
            document.querySelector('.music-album-background').style.visibility = 'hidden';
            // Hide back button
            document.querySelector('.back-button').style.visibility = 'hidden';
            // Hide playing button
            document.querySelector('.playing-button').style.visibility = 'hidden';
        }

    } catch (error) {
        console.error('Error fetching current track:', error);
        document.querySelector('.app-music-wrapper').innerHTML = `
            <h1>Error fetching track</h1>
        `;
        // Redirect to /login
        window.location.href = '/login';
    }
}

async function fetchAlbumImage(albumName, artistName) {
    const query = encodeURIComponent(`${albumName} ${artistName}`);
    const url = `https://itunes.apple.com/search?term=${query}&entity=album&limit=1`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.results && data.results.length > 0) {
            return data.results[0].artworkUrl100.replace("100x100bb.jpg", "600x600bb.jpg");
        }
    } catch (error) {
        console.error("Error fetching album image:", error);
    }

    return null;
}

document.querySelector('.music-control-prev').addEventListener('click', async () => {
    try {
        const response = await fetch('/previous', { method: 'POST' });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        refreshTrack();
    } catch (error) {
        console.error('Error going to previous track:', error);
    }
});

document.querySelector('.music-control-next').addEventListener('click', async () => {
    try {
        const response = await fetch('/skip', { method: 'POST' });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        refreshTrack();
    } catch (error) {
        console.error('Error going to next track:', error);
    }
});

document.querySelector('.music-control-play-pause').addEventListener('click', async () => {
    try {
        const response = await fetch('/playPause', { method: 'POST' });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Play/Pause response:', data);
        if (document.querySelector('.music-control-play-pause').classList.contains('fa-pause')) {
            document.querySelector('.music-control-play-pause').classList.remove('fa-pause');
            document.querySelector('.music-control-play-pause').classList.add('fa-play');
        } else {
            document.querySelector('.music-control-play-pause').classList.remove('fa-play');
            document.querySelector('.music-control-play-pause').classList.add('fa-pause');
        }
    } catch (error) {
        console.error('Error toggling play/pause:', error);
    }
});