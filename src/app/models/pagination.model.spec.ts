import { nameContainsPattern } from './pagination.model';

describe('nameContainsPattern', () => {
  it('should build a case-insensitive pattern from the trimmed text', () => {
    expect(nameContainsPattern('  Cloud storage ')).toBe('(?i)Cloud storage');
  });

  it('should escape regex metacharacters and quotes so they match literally', () => {
    expect(nameContainsPattern('a.b*c+d?(e)[f]{g}|h^i$j\\k"l')).toBe(
      '(?i)a\\.b\\*c\\+d\\?\\(e\\)\\[f\\]\\{g\\}\\|h\\^i\\$j\\\\k\\"l'
    );
  });

  it('should replace ; and & with a single-character wildcard', () => {
    expect(nameContainsPattern('R&D; tools')).toBe('(?i)R.D. tools');
  });
});
