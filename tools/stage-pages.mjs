import {cp, mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const build = (process.argv[2] || 'B1.1').toUpperCase();
if (!['B1', 'B1.1', 'B2'].includes(build)) throw new Error('Use B1, B1.1 or B2');
await mkdir(path.join(root, 'docs'), {recursive: true});
await cp(path.join(root, 'dist-' + build.toLowerCase()), path.join(root, 'docs'), {recursive: true});
console.log(`Staged ${build} in docs. Commit these files to publish at the same Pages URL.`);
