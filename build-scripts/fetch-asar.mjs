import { cpSync, readdirSync, mkdirSync, existsSync, writeFileSync } from "fs";
import pkgjson from '../package.json' with {type:'json'};

const dir = readdirSync('./out')?.find(fname => fname.match(/^holocure-buddy-\w+-x64$/));
const filePath = `./out/${dir}/resources/app.asar`;

const mkdir = d => !existsSync(d) ? mkdirSync(d) : null;
mkdir('./site/latest');
mkdir(`./site/${pkgjson.version}`)
cpSync(filePath, './site/latest/app.asar');
cpSync(filePath, `./site/${pkgjson.version}/app.asar`);

writeFileSync('./site/version.txt', pkgjson.version);
