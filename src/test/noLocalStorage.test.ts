import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === 'test' ? [] : walk(p);
    return /\.(ts|tsx)$/.test(name) ? [p] : [];
  });

describe('banco como fonte unica', () => {
  it('nenhum codigo de aplicacao usa localStorage, sessionStorage ou chaves eixo_*', () => {
    const ofensores = walk(join(process.cwd(), 'src')).filter((file) =>
      /localStorage|sessionStorage|eixo_[a-z]|diario_obras_app_data/.test(readFileSync(file, 'utf-8'))
    );
    expect(ofensores).toEqual([]);
  });
});
