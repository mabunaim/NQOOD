import {mkdir, readdir, copyFile, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
async function walk(dir, prefix = '') {
  const result = [];
  for (const entry of await readdir(dir, {withFileTypes:true})) {
    const relative = prefix + entry.name;
    if (entry.isDirectory()) result.push(...await walk(path.join(dir, entry.name), relative + '/'));
    else result.push(relative);
  }
  return result.sort();
}
for (const build of ['B1', 'B2']) {
  const output = path.join(root, 'dist-' + build.toLowerCase());
  const files = (await walk(path.join(root,'src'))).filter(file => file !== 'sw-template.js');
  for (const file of files) { await mkdir(path.dirname(path.join(output, file)), {recursive:true}); await copyFile(path.join(root,'src',file), path.join(output,file)); }
  await writeFile(path.join(output,'js/build-info.js'), `export const BUILD = '${build}';\nexport const BUILD_NOTE = '${build === 'B1' ? 'نسخة التحقق الأولى' : 'نسخة التحديث — البيانات محفوظة'}';\n`);
  const html = await readFile(path.join(output,'index.html'),'utf8');
  await mkdir(path.join(output,'fixtures'),{recursive:true});
  await writeFile(path.join(output,'fixtures/t08.html'),html.replace('<head>','<head>\n<base href="../">').replace('<title>مصاريك — تجربة الحفظ</title>','<title>مصاريك — فشل الحفظ T08</title>'));
  const assets = [...files, 'fixtures/t08.html'].sort();
  const template = await readFile(path.join(root,'src/sw-template.js'),'utf8');
  await writeFile(path.join(output,'sw.js'),template.replaceAll('__BUILD__',build).replace('__ASSETS__',JSON.stringify(assets)));
  await writeFile(path.join(output,'.nojekyll'),'');
  console.log(`${build}: ${assets.length} cached assets, ${output}`);
}
