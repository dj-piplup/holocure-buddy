const confirmBtn = document.getElementById('confirm');
const cancelBtn = document.getElementById('cancel');


window.electronAPI.onStartDownload(() => {
    const el = document.getElementById('content');
    const downloadText = document.createElement('H3');
    downloadText.innerText = 'Downloading.';
    el.replaceChildren();
    el.appendChild(downloadText);

    let dots = 1;
    setInterval(() => {
        dots = (dots % 3) + 1;
        downloadText.innerText = 'Downloading' + '.'.repeat(dots);
    }, 300)
});

confirmBtn.addEventListener('click', ()=>{
    window.electronAPI.sendDecision(true);
});

cancelBtn.addEventListener('click', ()=>{
    window.electronAPI.sendDecision(false);
});