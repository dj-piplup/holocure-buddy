import { existsSync, mkdirSync, readFileSync, watchFile, writeFileSync } from 'fs';
import os from 'os';
const cache = {};

const homedir = os.homedir();
const appDataFolder = homedir + (process.platform === 'win32' ? '\\AppData\\Local\\' : '/.local/share/');
const configFile = `${appDataFolder}Holocure-Buddy/config.json`;

export function watchSave(file, updateClear, updateLetter){
    let newSave = parseSave(readFileSync(file).toString());
    watchFile(file, (prev, curr) => {
        const oldSave = newSave;
        newSave = parseSave(readFileSync(file).toString());

        const newClear = getClearDiff(oldSave.completedStages,newSave.completedStages);
        if(newClear){
            updateClear(newSave, newClear);
        }
        
        const newLetter = getLetterDiff(oldSave.fanletters,newSave.fanletters);
        if(newLetter){
            updateLetter(newSave, newLetter);
        }
    });
}

export function parseStatics(saveFile){
    const out = {};
    const stageNames = saveFile.completedStages.map(s => s[0]);
    out.allStages = sortStages(stageNames.filter(s => s.startsWith('STAGE')));
    out.allChars = characterOrder().slice();
    return out;
}

export function getClears(saveFile){
    const allChars = characterOrder().slice();
    const byChar = {};
    for(const [stage, characters] of saveFile.completedStages){
        characters.forEach(char => (byChar[char] ??= []) && byChar[char].push(stage));
    };
    return allChars.map(c => [c, sortStages(byChar[c])]);
}

function p(path){
    return process.platform === 'win32' ? path.replaceAll('/','\\') : path;
}

function getLibraryPath(){
    if(cache.libPath){
        return cache.libPath;
    }
    const steamFolder = process.platform === 'win32' ? 'C:/Program Files (x86)/Steam' : `${homedir}/.local/share/Steam`;

    const librariesString = readFileSync(p(`${steamFolder}/steamapps/libraryfolders.vdf`)).toString()
        .replaceAll(/"\t\t"/g,'":"').replaceAll(/"\n\s*{/g,'":{').replaceAll(/"(\n\t*")/g,(_,c)=>'",'+c).replaceAll('\t','  ');
    const libraries = Object.values(JSON.parse(`\{${librariesString}\}`).libraryfolders);
    const holocureLibrary = libraries.find(l => '2420510' in l.apps);
    cache.libPath = holocureLibrary.path + '/steamapps';
    return cache.libPath;
}

function characterOrder(){
    const datawinString = cache.dataWin;
    return [...datawinString.matchAll(/([a-z]+)Gachikoi/g)].map(m => m[1]);
}

export function allLetters(){
    const datawinString = cache.dataWin;
    const i = datawinString.match(/Shrimp/).index;
    const e = datawinString.match(/allFanLetters/).index;
    return datawinString.slice(i, e).match(/[A-Z]\w+/g);
}

export function letterStatus(saveFile){
    return allLetters().map(l => [l, saveFile.fanletters.includes(l)]);
}

export function getClearDiff(oldData, newData){
    // This all assumes that the data was only updated to add at most 1 clear
    const newObj = Object.fromEntries(newData);
    for(const [stage,clears] of oldData){
        if(clears.length !== newObj[stage].length){
            const searchable = new Set(clears);
            const newChar = newObj[stage].find(char => !searchable.has(char));
            return {newChar,stage};
        }
    }
}

function getLetterDiff(oldData, newData){
    if(newData.length === oldData.length){
        return;
    }
    const set = new Set(oldData);
    return newData.find(letter => !set.has(letter));
}

/**
 * Sorts stages to make sure all hard stages come after all normal stages
 * @param {string[]} stages Stage names as an array 
 * @returns a copy of the stage array, but sorted as 1-X normal, 1-X hard
 */
export function sortStages(stages){
    return stages.toSorted((a,b) => {
        const aHard = /hard/i.test(a);
        const bHard = /hard/i.test(b);
        if(aHard && !bHard){
            return 1;
        }
        if(bHard && !aHard){
            return -1;
        }
        const na = parseInt(a);
        const nb = parseInt(b);
        return na - nb; 
    });
}

/**
 * Capitalize the first character of a string
 * @param {string} string - The string to capitalize
 */
export function c(string){
    return string[0].toUpperCase() + string.slice(1);
}

export async function findFiles(promptConfigs){
    const config = getConfig();
    let {save, data} = config ?? {};
    if(!save || !existsSync(save)){
        if(process.platform === 'win32'){
            save = p(`${appDataFolder}HoloCure\\save_n.dat`);
        } else {
            const libPath = getLibraryPath();
            save = `${libPath}/compatdata/2420510/pfx/drive_c/users/steamuser/AppData/Local/HoloCure/save_n.dat`;
        }
    }
    if(!existsSync(save)){
        save = undefined;
    }
    if(!data || !existsSync(data)){
        const libPath = getLibraryPath();
        
        data = p(libPath + '/common/HoloCure/data.win');
    }
    if(!existsSync(data)){
        data = undefined;
    }
    if(!save || !data){
        const newLocs = await promptConfigs({save, data});
        save = newLocs.save;
        data = newLocs.data;
    }
    if(save && data){
        const newConfig = {save,data};
        if(save !== config?.save || data !== config?.data){
            setConfig(newConfig);
        }
        cache.dataWin = readFileSync(data).toString();
        cache.dataLoc = data;
        cache.saveLoc = save;
        return newConfig;
    }
    throw new Error('No save files found or provided');
}

function getConfig(){
    if(existsSync(configFile)){
        const config = readFileSync(configFile).toString();
        if(config.replaceAll(/\s/g,'').match(/\{"(save|data)":".*","(save|data)":".*"\}/)){
            return JSON.parse(config);
        }
    }
}

function setConfig(configObj){
    if(!existsSync(appDataFolder + 'Holocure-Buddy')){
        mkdirSync(appDataFolder + 'Holocure-Buddy');
    }
    writeFileSync(configFile, JSON.stringify(configObj));
}

/**
 * Re-encodes and parses a HoloCure save file as JSON
 * @param {string} fileContents - The raw content from readFileSync.toString 
 * @returns - The HoloCure save file contents as JSON
 */
export function parseSave(fileContents){
    if(!fileContents){
        return {};
    }
    const saveContentsString = Buffer.from(fileContents, 'base64').toString('ascii');
    return JSON.parse(saveContentsString);
}
