/**
 * QA v1.2 (relecture RG-158) : défauts de traduction démontrés par un test.
 * Contresens corrigé dans words.ts (V12-01) : ce test est maintenant un test normal.
 */
import { WORDS_BY_ID } from '@/data/words';

describe('QA v1.2 : relecture des traductions (RG-158)', () => {
  // V12-01 : « I study at the library » → « Je travaille à la bibliothèque » se lit « I work at the library ».
  test('library : « study » n’est pas rendu par « travaille » (contresens probable)', () => {
    expect(WORDS_BY_ID.get('library')?.exampleFr).not.toMatch(/\btravaille\b/);
  });
});
