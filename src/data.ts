import { Viz } from '@viz-js/viz';

import type { ModifierStyle } from './modifiers';
import type { Data } from 'process-mgmt/src/structures.js';

export interface Lab {
  items: Record<string, LabItem>;
  processes: Record<string, LabProcess>;
}

export interface LabItem {
  // undefined: same as our id, null: synthetic
  labId?: string | null;
  name: string;
  iconPos?: string;
  contained?: true;
  stack?: number;
}

export interface LabProcess {
  name: string;
  iconPos?: string;
  contained?: true;
}

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

export const toLab: Record<DataSetId, string | null> = {
  'for-the-crown-3.8.3': null,
  dsp: 'dsp',
  'factorio-ab-1.1.38': 'bobang',
  'factorio-py-1.1.53': 'pysalf',
  'factorio-ff-1.1.76': 'ffw',
  'factorio-ff-1.1.94': 'ffw',
  'plan-b-terraform': null,
  satisfactory: 'sfy',
  vt: null,
};

export interface DataSet {
  pm: Data;
  lab?: Lab;
  ico?: string;
  viz: Viz;
}

export const loadedDataSets: Record<DataSetId, DataSet> = {} as any;

export type DataSetId = keyof typeof dataSets;

export const loadProcMgmt = async (id: DataSetId): Promise<Data> =>
  (await import(`process-mgmt/src/${id}/data.js`)).default;

export const loadDataSet = async (id: DataSetId): Promise<void> => {
  if (loadedDataSets[id]) return;
  const pm = await loadProcMgmt(id);
  const labId = toLab[id];

  let lab, ico;
  if (labId) {
    [lab, ico] = await Promise.all([
      import(`../data/${labId}.json`).then((m) => m.default),
      import(`../data/${labId}.webp`).then((m) => m.default),
    ]);

    preloadImage(ico);
  }

  // sigh
  const viz = await (await import('@viz-js/viz')).instance();

  loadedDataSets[id] = { pm, lab, ico, viz };
};

const preloadImage = (src: string) => {
  const img = new Image();
  img.src = src;
};
