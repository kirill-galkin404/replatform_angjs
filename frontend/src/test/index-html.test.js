import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const html = readFileSync(resolve(__dirname, '../../index.html'), 'utf8');

function scripts() {
  return Array.from(html.matchAll(/<script\b([^>]*)>/gi)).map((m) => ({
    attrs: m[1],
    index: m.index,
    src: (m[1].match(/\bsrc\s*=\s*["']([^"']*)["']/i) || [])[1],
    isModule: /\btype\s*=\s*["']?module["']?/i.test(m[1]),
  }));
}

describe('index.html', () => {
  it('env.js is a classic (non-module) script loaded before the module script', () => {
    const list = scripts();
    const env = list.find((s) => s.src && /(^|\/)env\.js$/.test(s.src));
    const mod = list.find((s) => s.isModule);
    expect(env).toBeDefined();
    expect(env.isModule).toBe(false);
    expect(/\btype\s*=/i.test(env.attrs)).toBe(false);
    expect(mod).toBeDefined();
    expect(mod.src).toMatch(/main\.jsx$/);
    expect(env.index).toBeLessThan(mod.index);
  });

  it('has a #root mount point', () => {
    expect(html).toMatch(/<div id="root"><\/div>/);
  });

  it('has no CDN, angular, jquery, ng-* or inline handler markup', () => {
    expect(html).not.toMatch(/angular/i);
    expect(html).not.toMatch(/jquery/i);
    expect(html).not.toMatch(/\bng-[a-z]/i);
    expect(html).not.toMatch(/\bonclick\s*=/i);
    expect(html).not.toMatch(/cdn/i);
  });

  it('no script loads from an http(s):// URL', () => {
    for (const s of scripts()) {
      expect(s.src).toBeDefined();
      expect(s.src).not.toMatch(/^(https?:)?\/\//i);
    }
  });
});
