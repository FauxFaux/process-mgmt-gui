import type { ModifierStyle } from './modifiers';
import type { Data } from 'process-mgmt/src/structures.js';

const ds = (name: string, duration: ModifierStyle, output: ModifierStyle) =>
  [name, duration, output] as const;

export const dataSets = {
  'for-the-crown-3.8.3': ds('For The Crown (3.8.3)', 'raw', 'raw'),
  dsp: ds('DSP', 'raw', 'raw'),
  'factorio-ab-1.1.38': ds('Factorio AB (1.1.38)', 'additional', 'additional'),
  'factorio-py-1.1.53': ds('Factorio PY (1.1.53)', 'additional', 'additional'),
  'factorio-ff-1.1.76': ds('Factorio FF (1.1.76)', 'additional', 'additional'),
  'factorio-ff-1.1.94': ds('Factorio FF (1.1.94)', 'additional', 'additional'),
  'plan-b-terraform': ds('Plan B, Terraform', 'raw', 'raw'),
  satisfactory: ds('Satisfactory', 'normal', 'normal'),
  vt: ds('Voxel Tycoon', 'raw', 'raw'),
};

export type DataSet = Data;
export const loadedDataSets: Record<DataSetId, DataSet> = {} as any;

export type DataSetId = keyof typeof dataSets;

export const loadDataSet = async (id: DataSetId): Promise<void> => {
  if (loadedDataSets[id]) return;
  loadedDataSets[id] = (await import(`process-mgmt/src/${id}/data.js`)).default;
};
