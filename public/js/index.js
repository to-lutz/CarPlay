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
        openApp(appName);
    });
});

document.querySelectorAll('.app-big').forEach(icon => {
    icon.addEventListener('click', () => {
        let appName = icon.id;
        openApp(appName);
    });
});

function openApp(appName) {
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
    }
}

async function startMusicApp() {
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

            document.querySelector('.music-album-background').src = albumImage;
            document.querySelector('.music-album-cover').src = albumImage
            document.querySelector('#song-name').textContent = songName;
            document.querySelector('#album-name').textContent = albumName;
            document.querySelector('#artist-names').textContent = artists;
        } else {
            document.querySelector('.app-music-wrapper').innerHTML = `
                <h1>No track playing</h1>
            `;
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