import {cp, mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const build = (process.argv[2] || 'V1.0.2').toUpperCase();
if (!['B1', 'B1.1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9', 'B10', 'B11', 'B12', 'V1.0.0', 'V1.0.1', 'V1.0.2'].includes(build)) throw new Error('Use B1, B1.1, B2 or B11');
await mkdir(path.join(root, 'docs'), {recursive: true});
await cp(path.join(root, 'dist-' + build.toLowerCase()), path.join(root, 'docs'), {recursive: true});
console.log(`Staged ${build} in docs. Commit these files to publish at the same Pages URL.`);
