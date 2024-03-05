import type { ModifierStyle } from './modifiers';
import type { Data } from 'process-mgmt/dist/structures.js';

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
  'factorio-1.1.104-very-bz-0.5.1': ds(
    'Factorio 1.1.104, Very BZ 0.5.1',
    'additional',
    'additional',
  ),
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
  'factorio-1.1.104-very-bz-0.5.1': 'vbz',
  'plan-b-terraform': null,
  satisfactory: 'sfy',
  vt: null,
};

export interface DataSet {
  pm: Data;
  lab?: Lab;
  ico?: string;
}

export type DataSetId = keyof typeof dataSets;

export const loadProcMgmt = async (id: DataSetId): Promise<Data> =>
  (await import(`process-mgmt/dist/${id}/data.js`)).default;

export const loadDataSet = async (id: DataSetId): Promise<DataSet> => {
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

  return { pm, lab, ico };
};

const preloadImage = (src: string) => {
  if (typeof Image === 'undefined') return;
  const img = new Image();
  img.src = src;
};
