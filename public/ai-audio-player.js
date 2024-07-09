document.addEventListener("DOMContentLoaded", function () {
    const audio = document.getElementById('audio');
    const playPauseButton = document.getElementById('playPauseButton');
    const progressBar = document.getElementById('progressBar');
    const progressBarFilled = document.getElementById('progressBarFilled');
    const progressBarThumb = document.getElementById('progressBarThumb');
    const timeDisplay = document.getElementById('timeDisplay');
    let isDragging = false;

    playPauseButton.addEventListener('click', function () {
        if (audio.paused) {
            audio.play();
            playPauseButton.innerHTML = '<i class="fa fa-pause"></i>';
        } else {
            audio.pause();
            playPauseButton.innerHTML = '<i class="fa fa-play"></i>';
        }
    });

    audio.addEventListener('timeupdate', function () {
        if (!isDragging) {
            const progress = (audio.currentTime / audio.duration) * 100;
            progressBarFilled.style.width = progress + '%';
            progressBarThumb.style.left = progress + '%';
            updateTimeDisplay();
        }
    });

    progressBar.addEventListener('click', function (e) {
        const rect = progressBar.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const progress = offsetX / progressBar.offsetWidth;
        audio.currentTime = progress * audio.duration;
    });

    progressBarThumb.addEventListener('mousedown', function () {
        isDragging = true;
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', onStopDrag);
    });

    function onDrag(e) {
        const rect = progressBar.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        let progress = offsetX / progressBar.offsetWidth;
        progress = Math.min(Math.max(progress, 0), 1);
        progressBarFilled.style.width = progress * 100 + '%';
        progressBarThumb.style.left = progress * 100 + '%';
    }

    function onStopDrag(e) {
        const rect = progressBar.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const progress = offsetX / progressBar.offsetWidth;
        audio.currentTime = progress * audio.duration;
        isDragging = false;
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('mouseup', onStopDrag);
    }

    function updateTimeDisplay() {
        const currentMinutes = Math.floor(audio.currentTime / 60);
        const currentSeconds = Math.floor(audio.currentTime % 60);
        const durationMinutes = Math.floor(audio.duration / 60);
        const durationSeconds = Math.floor(audio.duration % 60);
        timeDisplay.textContent =
            `${String(currentMinutes).padStart(2, '0')}:${String(currentSeconds).padStart(2, '0')} / 
             ${String(durationMinutes).padStart(2, '0')}:${String(durationSeconds).padStart(2, '0')}`;
    }
});
