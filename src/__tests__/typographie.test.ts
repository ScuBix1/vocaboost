/**
 * Typographie française (recette design v2, V2-05) : aucun texte de l'app ne contient
 * d'espace ordinaire avant « ! ? : ; ». On utilise une espace insécable (U+00A0) pour que la
 * ponctuation ne se retrouve jamais seule en début de ligne.
 * Contrôle systématique : chaque chaîne, gabarit et texte JSX du code source (hors tests).
 */
import ts from 'typescript';

// Pas de @types/node dans le projet : typage minimal des modules Node utilisés par ce test.
declare const require: (name: string) => unknown;
declare const __dirname: string;
const fs = require('fs') as {
  readdirSync(dir: string): string[];
  statSync(p: string): { isDirectory(): boolean };
  readFileSync(p: string, enc: 'utf8'): string;
};
const path = require('path') as { join(...parts: string[]): string; relative(from: string, to: string): string };

const SRC = path.join(__dirname, '..');

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) return name === '__tests__' ? [] : sourceFiles(full);
    return /\.tsx?$/.test(name) ? [full] : [];
  });
}

function textNodes(file: string): { line: number; text: string }[] {
  const code = fs.readFileSync(file, 'utf8');
  const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, kind);
  const out: { line: number; text: string }[] = [];
  const visit = (node: ts.Node) => {
    if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node) ||
      ts.isJsxText(node)
    ) {
      out.push({ line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1, text: node.getText(sf) });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

describe('Typographie française (V2-05)', () => {
  it('espace insécable avant « ! ? : ; » dans tous les textes de l’app', () => {
    const offenders = sourceFiles(SRC).flatMap((file) =>
      textNodes(file)
        .filter(({ text }) => / [!?:;]/.test(text))
        .map(({ line, text }) => `${path.relative(SRC, file)}:${line} ${text.trim()}`),
    );
    expect(offenders).toEqual([]);
  });
});
