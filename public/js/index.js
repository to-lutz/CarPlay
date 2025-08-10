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
            document.querySelector('.app-maps').style.display = 'flex';
            document.querySelector('.app-maps').style.visibility = 'visible';
            // Initialize map
            const map = new maplibregl.Map({
                container: 'map',
                style: '/stylesheets/applemaps.json',
                center: [13.404954, 52.520008], // Start-Fallback → Berlin
                zoom: 12
            });

            map.addControl(new maplibregl.NavigationControl());

            if ('geolocation' in navigator) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const lng = position.coords.longitude;
                        const lat = position.coords.latitude;

                        map.setCenter([lng, lat]);
                        map.setZoom(15);

                        const markerEl = document.createElement('div');
                        markerEl.classList.add('app-maps-marker');

                        markerEl.innerHTML = `
                        <svg
                            width="17"
                            height="17"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                            style="transform: rotate(-45deg);"
                        >
                            <path
                            d="M12 2 L19 20 L12 16 L5 20 Z"
                            fill="white"
                            stroke="white"
                            stroke-width="2"
                            stroke-linejoin="round"
                            />
                            <path
                            d="M12 2 L19 20 L12 16 L5 20 Z"
                            fill="none"
                            stroke="white"
                            stroke-width="2.5"
                            stroke-linejoin="round"
                            />
                        </svg>
                        `;

                        usermarker = new maplibregl.Marker({ element: markerEl })
                            .setLngLat([lng, lat])
                            .addTo(map);

                        drawRoute(map, [lng, lat], [13.4050, 52.5200]); // Example destination (Berlin)
                    },
                    (error) => {
                        alert('Geolocation-Fehler:' + error.code + ' - ' + error.message);
                    },
                    {
                        enableHighAccuracy: true,
                        timeout: 5000,
                        maximumAge: 0
                    }
                );
            } else {
                alert('Geolocation wird nicht unterstützt');
            }
    }
}

async function getRoute(start, end) {
    const url = `https://router.project-osrm.org/route/v1/driving/${start[0]},${start[1]};${end[0]},${end[1]}?overview=full&geometries=geojson&steps=true`;
    const response = await fetch(url);
    const json = await response.json();
    return json.routes[0].geometry;
}


async function drawRoute(map, start, end) {
    const routeGeoJSON = await getRoute(start, end);

    if (map.getSource('route')) {
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

// Rotate maps arrow
window.addEventListener('deviceorientation', (event) => {
    const alpha = event.alpha; // Drehung um die Z-Achse (0-360°)
    if (alpha !== null) {
        // alpha ist die Kompass-Richtung in Grad
        // Rotationswinkel für deinen Marker: (360 - alpha) oder (alpha) je nach Ausrichtung
        const rotation = 360 - alpha;

        // Marker-Element rotieren:
        markerEl.style.transform = `rotate(${rotation}deg)`;
    }
});

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
            const albumImage = item.album.images[0].url;
            const artists = item.artists.map(artist => artist.name).join(', ');
            const isPlaying = data.is_playing;

            document.querySelector('.music-album-background').src = albumImage;
            document.querySelector('.music-album-cover').src = albumImage
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