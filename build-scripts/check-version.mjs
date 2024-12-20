import { existsSync, writeFileSync } from "fs";
import pkgjson from '../package.json' with {type:'json'};

if(existsSync(`./site/${pkgjson.version}/app.asar`)){
    console.error(`Version ${pkgjson.version} already exists`);
    process.exit(1);
}

writeFileSync('./src/version.txt',pkgjson.version);