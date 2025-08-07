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