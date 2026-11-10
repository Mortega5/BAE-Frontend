import { Dataset } from 'src/app/services/dataset.service';
import { buildDatasetColumns, pageOfDatasets } from './dataset-table';

describe('dataset table helpers', () => {
  const base: Dataset = { id: 'i', name: 'N', version: '1.0', lifecycleStatus: 'Launched', visibility: 'private', fileId: 'f', filename: 'a.csv' };

  it('shows - for what an incomplete dataset lacks', () => {
    const [name, format, size, , version] = buildDatasetColumns();
    const incomplete = { ...base, incomplete: true };

    expect(name.getValue!(incomplete)).toBe('N');
    expect(format.getValue!(incomplete)).toBe('CSV');
    expect(size.getValue!(incomplete)).toBe('-');
    expect(version.getValue!(incomplete)).toBe('1.0');
  });

  it('shows a badge per visibility, private when the proxy sends none', () => {
    const visibility = buildDatasetColumns().find(c => c.header === 'DATASETS._visibility') as any;

    expect(visibility.getValue({ ...base, visibility: 'public' })).toBe('DATASETS._visibility_public');
    expect(visibility.getValue({ ...base, visibility: 'custom' })).toBe('DATASETS._visibility_custom');
    expect(visibility.getValue({ ...base, visibility: undefined })).toBe('DATASETS._visibility_private');
    expect(visibility.getStatus({ ...base, visibility: 'public' })).toBe('info');
    expect(visibility.getStatus({ ...base, visibility: 'custom' })).toBe('warning');
    expect(visibility.getStatus(base)).toBe('neutral');
  });

  it('breaks very long names anywhere', () => {
    const [name] = buildDatasetColumns();
    const cellClass = name.cellClass as (item: Dataset) => string;
    expect(cellClass({ ...base, name: 'x'.repeat(30) })).toBe('break-all');
    expect(cellClass(base)).toBe('break-words');
  });

  it('pages the whole list in memory', () => {
    const all = Array.from({ length: 5 }, (_, i) => ({ ...base, id: `d${i}` }));
    const page = pageOfDatasets(all, { offset: 2, limit: 2 } as any);

    expect(page.items.map(d => d.id)).toEqual(['d2', 'd3']);
    expect(page.total).toBe(5);
  });
});
