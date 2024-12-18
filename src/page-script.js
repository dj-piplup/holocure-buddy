let lastRoll = 'any';
const randos = {
    stage: () => {
        lastRoll = 'stage';
        randomChar({stages: true});
    },
    gachikoi: ()=> {
        lastRoll = 'gachikoi';
        randomChar({gachikoi: true});
    },
    any: ()=>{
        lastRoll = 'any'
        randomChar();
    }
}

//#region Setup
window.electronAPI.onSaveUpdated(({saveData, staticData}) => {
    if(staticData){
        window.holocureStatic = staticData;
    }
    window.holocureSave = saveData;
    window.holocureGachikoi = new Set(saveData.fandomEXP.flatMap(([name,xp]) => xp >= 100 ? [name] : []));
    let hasBeatAll;
    const completionMap = Object.fromEntries(saveData.completedStages);
    const stageKeys = Object.keys(completionMap).filter(s => s.startsWith('STAGE'));
    stageKeys.forEach(s => {
        hasBeatAll ??= completionMap[s];
        hasBeatAll = completionMap[s].filter(c => hasBeatAll.includes(c));
    });
    window.holocureFullyCleared = new Set(hasBeatAll);
    window.holocureOwned = saveData.characters.flatMap(([name,pulls]) => pulls > 0 ? [name] : []);

    if(window.holocureGachikoi.size === window.holocureStatic.allChars.length){
        const gbtn = document.getElementById('random-gachikoi');
        gbtn.removeEventListener('click', randos.gachikoi);
        gbtn.parentElement.removeChild(gbtn);
    }

    if(window.holocureFullyCleared.size === window.holocureStatic.allChars.length){
        const sbtn = document.getElementById('random-stage');
        sbtn.removeEventListener('click', randos.stage);
        sbtn.parentElement.removeChild(sbtn);
    }
});

window.electronAPI.onLetters(({full,added}) => {
    updateLetterOutput(full);
    if(added){
        log(`Obtained new letter: ${added}`);
    }
});

window.electronAPI.onClears(({full,added}) => {
    updateClearOutput(full);
    if(added){
        log(`${added.newChar} has completed ${added.stage}`);
        if(document.getElementById('auto-roll')?.checked){
            if(!document.getElementById(`random-${lastRoll}`)){
                lastRoll = 'any';
            }
            randos[lastRoll]();
        }
    }
});

document.getElementById('random-stage').addEventListener('click', randos.stage);
document.getElementById('random-gachikoi').addEventListener('click', randos.gachikoi);
document.getElementById('random-any').addEventListener('click', randos.any);
//#endregion Setup

//#region Output
function abbrStage(stageName){
    const {number,hard} = /^STAGE (?<number>\d+)( \((?<hard>H)ARD\))?$/.exec(stageName).groups;
    return `${number}${hard ?? ''}`;
}

function updateClearOutput(clearData){
    const stages = window.holocureStatic.allStages
    const destination = document.getElementById('clears-zone');
    observeSize(destination);
    const rows = [];
    for(const [character,clears] of clearData){
        let output = `<div class='row'><strong class='name'>${formatText(character)}</strong>`;
        output += stages.map(s => `<div class='${clears.includes(s) ? 'cleared stage' : 'stage'}'><span>${abbrStage(s)}</span></div>`).join('');
        output += `</div>`;
        rows.push(output);
    };
    destination.innerHTML = rows.join('');
}

function updateLetterOutput(letters){
    const destination = document.getElementById('letters-zone');
    observeSize(destination);
    const rows = [];
    letters.forEach(([letter,clear],index) => {
        rows.push(`<div class='${clear ? 'cleared row' : 'row'}'><div class='stage'>${index + 1}</div><div class='letter'>${letter}</div></div>`);
    });
    destination.innerHTML = rows.join('');
}

let lastChar;
let repeatCount = 0;
function randomChar({gachikoi, stages} = {}){
    let pool = window.holocureOwned.slice();
    if(gachikoi){
        pool = pool.filter(name => !window.holocureGachikoi.has(name));
    }
    if(stages){
        pool = pool.filter(c => !window.holocureFullyCleared.has(c));
    }

    if(pool.length === 0){
        return;
    }
    
    const random = new Uint16Array(1);
    crypto.getRandomValues(random);
    const c = formatText(pool[random[0] % pool.length]);
    if(c === lastChar){
        repeatCount += 1;
    } else {
        repeatCount = 0;
    }
    lastChar = c;
    let postScript;
    if(repeatCount > 0){
        if(repeatCount < 3){
            postScript = 'again'.repeat(repeatCount);
        } else {
            postScript = 'many times';
        }
    }
    postScript &&= ` (${postScript})`;
    document.getElementById(`output-roll`).innerHTML = `You rolled: <strong>${c}</strong>` + (postScript ?? '');

}

function formatText(t){
    return t.toLowerCase().replaceAll(/\b[a-z]/g,c => c.toUpperCase());
}

function log(t){
    const text = document.createElement('pre');
    const d = new Date();
    const time = d.toLocaleTimeString();
    text.innerText = `> (${time}) ${t}`;
    document.getElementById('log-section').appendChild(text);
}


//#endregion Output

//#region Column distribution
function clamp(v, min, max){
    return Math.max(min, Math.min(v, max));
}

function sizeCallback(entries){
    const recent = entries.at(-1);
    const {inlineSize} = recent.contentBoxSize.at(-1);
    const colWidth = recent.target.querySelector('.row').getBoundingClientRect().width;
    const thingCount = recent.target.querySelectorAll('.row').length
    let colCount = Math.floor(inlineSize/(colWidth + 16));
    let colLength = Math.ceil( thingCount / colCount);
    if(colLength < 20){
        colLength = 20;
        colCount = Math.ceil( thingCount / 20);
    }
    if(colCount < 1){
        colCount = 1;
        colLength = thingCount;
    }
    recent.target.style.setProperty('--column-length',colLength.toString());
    recent.target.style.setProperty('--column-width',`${colWidth}px`);
}

let observing = new Map();
function observeSize(el){
    if(!observing.has(el.id)){
        const obs = new ResizeObserver(sizeCallback).observe(el);
        observing.set(el.id, obs);
    }
}
//#endregion
