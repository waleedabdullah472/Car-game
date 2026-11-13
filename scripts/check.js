/* Pre-build checks: engine syntax, vercel.json/package.json validity, English-only text. */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let fail = 0;
const ok = (m) => console.log('  ok   ' + m);
const bad = (m) => { fail++; console.log('  FAIL ' + m); };

const eng = path.join(root, 'src/engine');
fs.readdirSync(eng).filter((f) => f.endsWith('.js') && f !== 'index.js').forEach((f) => {
  try { execFileSync(process.execPath, ['--check', '--input-type=commonjs', '-'], { input: fs.readFileSync(path.join(eng, f)), stdio: ['pipe', 'pipe', 'pipe'] }); ok('syntax ' + f); }
  catch (e) { bad('syntax ' + f + '\n' + String(e.stderr)); }
});
['vercel.json', 'package.json'].forEach((f) => {
  try { JSON.parse(fs.readFileSync(path.join(root, f), 'utf8')); ok(f + ' is valid JSON'); } catch (e) { bad(f + ': ' + e.message); }
});
['public/vendor/three.min.js', 'index.html', 'src/main.jsx', 'src/App.jsx'].forEach((f) => fs.existsSync(path.join(root, f)) ? ok('file ' + f) : bad('missing ' + f));

const banned = /\b(karein|chalayein|chalana|shuru|raftar|faasla|awaaz|gaari|takkar|dobara|badlein|haan|nahi|aap|mujhe|zindagi)\b/i;
(function walk(d) {
  fs.readdirSync(d).forEach((n) => {
    const p = path.join(d, n), st = fs.statSync(p);
    if (st.isDirectory()) return walk(p);
    if (!/\.(jsx?|css|html)$/.test(n)) return;
    const s = fs.readFileSync(p, 'utf8');
    if (banned.test(s)) bad('Roman Urdu word in ' + path.relative(root, p));
    else if (/[؀-ۿ]/.test(s)) bad('Arabic script in ' + path.relative(root, p));
  });
})(path.join(root, 'src'));
ok('English-only text scan');
console.log(fail ? `\n${fail} check(s) failed` : '\nAll checks passed');
process.exit(fail ? 1 : 0);
