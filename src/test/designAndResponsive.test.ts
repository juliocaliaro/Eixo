import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('1. Validação de Design System e Paleta Corporativa (CSS)', () => {
  const cssPath = path.resolve(__dirname, '../index.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');

  it('deve conter as variáveis da paleta corporativa oficial', () => {
    expect(cssContent).toContain('--pitch-black-950: #1e1806;');
    expect(cssContent).toContain('--dark-coffee-50: #f8f3ed;');
    expect(cssContent).toContain('--dark-coffee-950: #1a130a;');
    expect(cssContent).toContain('--mauve-bark-50: #f6f0ee;');
    expect(cssContent).toContain('--cinnamon-wood-500: #b5684a;');
    expect(cssContent).toContain('--coral-glow-500: #f2420d;');
  });

  it('deve conter os tokens semânticos principais do Eixo', () => {
    expect(cssContent).toContain('--primary-accent: var(--coral-glow-500);');
    expect(cssContent).toContain('--bg-app: var(--dark-coffee-50);');
    expect(cssContent).toContain('--border-hairline: var(--dark-coffee-200);');
    expect(cssContent).toContain('--radius-md: 12px;');
    expect(cssContent).toContain('--radius-lg: 16px;');
  });
});

describe('2. Validação de Responsividade: Web (Desktop > 768px) vs Mobile (<= 768px)', () => {
  const cssPath = path.resolve(__dirname, '../index.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');

  it('deve implementar layout de Decisões responsivo (Aberto no Desktop vs Accordion no Mobile)', () => {
    expect(cssContent).toMatch(/\.decisao-card-desktop\s*\{\s*display:\s*block;/);
    expect(cssContent).toMatch(/\.decisao-card-mobile\s*\{\s*display:\s*none;/);

    const mobileBreakpoints = cssContent.match(/@media\s*\(max-width:\s*768px\)\s*\{[^}]*decisao-card-desktop[^}]*\}/s);
    expect(mobileBreakpoints).not.toBeNull();
    expect(mobileBreakpoints?.[0]).toContain('display: none !important');
  });

  it('deve implementar layout de Diário responsivo (Aberto no Desktop vs Accordion no Mobile)', () => {
    expect(cssContent).toMatch(/\.diario-card-desktop\s*\{\s*display:\s*block;/);
    expect(cssContent).toMatch(/\.diario-card-mobile\s*\{\s*display:\s*none;/);

    const diarioMobile = cssContent.match(/@media\s*\(max-width:\s*768px\)\s*\{[^}]*diario-card-desktop[^}]*\}/s);
    expect(diarioMobile).not.toBeNull();
    expect(diarioMobile?.[0]).toContain('display: none !important');
  });

  it('deve converter cards de projetos em coluna no mobile', () => {
    const projetoMobile = cssContent.match(/@media\s*\(max-width:\s*768px\)\s*\{[^}]*\.projeto-card\s*\{[^}]*flex-direction:\s*column;/s);
    expect(projetoMobile).not.toBeNull();
  });

  it('deve configurar modais como bottom-sheet ancorados no mobile', () => {
    const modalMobile = cssContent.match(/@media\s*\(max-width:\s*768px\)\s*\{[^}]*\.modal-backdrop\s*\{[^}]*align-items:\s*flex-end/s);
    expect(modalMobile).not.toBeNull();
    expect(cssContent).toContain('animation: slideUpModal');
  });

  it('deve ocultar contadores secundários e botões de teste no mobile', () => {
    const suppressMobile = cssContent.match(/@media\s*\(max-width:\s*768px\)\s*\{[^}]*share-testar-cliente-btn[^}]*display:\s*none\s*!important/s);
    expect(suppressMobile).not.toBeNull();
  });
});

describe('3. Diretrizes de UX/UI e Conformidade de Código', () => {
  it('não deve conter window.alert ou window.confirm no código de componentes', () => {
    const componentsDir = path.resolve(__dirname, '../components');
    const files = fs.readdirSync(componentsDir).filter((f: string) => f.endsWith('.tsx'));

    for (const file of files) {
      const code = fs.readFileSync(path.join(componentsDir, file), 'utf-8');
      expect(code).not.toMatch(/window\.alert\s*\(/);
      expect(code).not.toMatch(/window\.confirm\s*\(/);
    }
  });

  it('deve utilizar input unificado para fotos e suporte a PDF em Registro de Locações e Notas', () => {
    const locacaoPath = path.resolve(__dirname, '../components/ModalRegistroLocacao.tsx');
    const locacaoCode = fs.readFileSync(locacaoPath, 'utf-8');
    expect(locacaoCode).toContain('accept="image/*"');
    expect(locacaoCode).toContain('accept="application/pdf,.pdf"');
    expect(locacaoCode).toContain('name="quantidade"');
    expect(locacaoCode).toContain('type="number"');

    const notaPath = path.resolve(__dirname, '../components/ModalRegistroNota.tsx');
    const notaCode = fs.readFileSync(notaPath, 'utf-8');
    expect(notaCode).toContain('accept="image/*"');
    expect(notaCode).toContain('accept="application/pdf,.pdf"');
  });

  it('não deve conter o input duplicado "Criar agrupamento" na parte inferior do card de etapas', () => {
    const timelinePath = path.resolve(__dirname, '../components/TimelineEtapas.tsx');
    const timelineCode = fs.readFileSync(timelinePath, 'utf-8');
    expect(timelineCode).not.toContain('Criar agrupamento nesta etapa');
  });
});
