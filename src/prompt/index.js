const saveInput = document.getElementById('save-input');
const dataInput = document.getElementById('data-input');
const saveOpenButton = document.getElementById('open-save-button');
const dataOpenButton = document.getElementById('open-data-button');
const confirmButton = document.getElementById('confirm-button');
const cancelButton = document.getElementById('cancel-button');


window.electronAPI.onPreFill(({save,data}) => {
    saveInput.value = save ?? '';
    dataInput.value = data ?? '';
});

saveOpenButton.addEventListener('click', async ()=>{
    const file = await window.electronAPI.openFile();
    if(file){
        saveInput.value = file;
    }
});

dataOpenButton.addEventListener('click', async ()=>{
    const file = await window.electronAPI.openFile();
    if(file){
        dataInput.value = file;
    }
});

confirmButton.addEventListener('click', () => {
    const result = {
        save: saveInput.value,
        data: dataInput.value
    };
    window.electronAPI.confirmFiles(result);
});

cancelButton.addEventListener('click', () => {
    window.electronAPI.cancelFiles();
});