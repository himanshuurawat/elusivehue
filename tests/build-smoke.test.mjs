import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, stat} from 'node:fs/promises';
import path from 'node:path';

// Run npm run build first. These tests inspect files, not a live account.
const output = path.resolve('dist');
const html = await readFile(path.join(output, 'index.html'), 'utf8');

async function builtFile(url) {
  const relative = decodeURIComponent(url.split(/[?#]/)[0]).replace(/^\//, '');
  const filename = path.resolve(output, relative);
  assert.ok(filename.startsWith(output + path.sep), 'Asset must stay inside dist');
  const info = await stat(filename);
  assert.ok(info.isFile() && info.size > 0, `Expected a nonempty built file: ${relative}`);
}

test('built entry has a root mount and a module script', () => {
  assert.match(html, /<div\s+id=["']root["']/);
  assert.match(html, /<script\b[^>]*type=["']module["'][^>]*src=/);
  assert.doesNotMatch(html, /src=["']\/?main\.tsx["']/);
});

test('entry scripts, styles and local icons exist in the build', async () => {
  const references = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
    .map(match => match[1])
    .filter(url => !/^(?:[a-z]+:|\/\/|#)/i.test(url));
  assert.ok(references.some(url => /\.js(?:[?#]|$)/.test(url)), 'Expected a built JavaScript bundle');
  assert.ok(references.some(url => /\.css(?:[?#]|$)/.test(url)), 'Expected a built stylesheet');
  for (const url of references) await builtFile(url);
});

test('privacy and terms ship with the site', async () => {
  for (const page of ['privacy.html', 'terms.html']) {
    await builtFile(page);
    const contents = await readFile(path.join(output, page), 'utf8');
    assert.match(contents, /<html\b/i, `Expected an HTML document: ${page}`);
  }
});
