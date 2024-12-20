import { writeFileSync } from "original-fs";

export const currentVersion = await fetch('https://holocure-buddy-updates.web.app/version.txt').then(r => r.text());
export function checkForUpdates(v){
    if(!v){
        return true;
    }
    return parseVersion(v) < parseVersion(currentVersion);
}

function parseVersion(vString){
    const {major,minor,patch} = vString.match(/(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)/).groups ?? {};
    if(major === undefined || minor === undefined || patch === undefined){
        return '0';
    }
    return major.padStart(3,'0') + minor.padStart(3,'0') + patch.padStart(3,'0')
}

export async function downloadLatest(dir){
    const data = await fetch(`https://holocure-buddy-updates.web.app/${currentVersion}/app.asar`).then(r => r.bytes());
    writeFileSync(dir,data);
}