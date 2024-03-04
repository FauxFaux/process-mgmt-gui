import { describe, expect, it } from '@jest/globals';

import {
  applyHints,
  computeUnknowns,
  makeInputs,
  updateInputsWithHints,
} from '../src/backend/mgmt';
import { loadDataSet } from '../src/data';
import type { Line } from '../src/components/requirement-table';

describe('mgmt backend', () => {
  it('boots', async () => {
    const ds = await loadDataSet('factorio-ff-1.1.94');
    let reqs: Line[] = [
      { item: 'transport-belt', req: { op: 'produce', amount: 1 } },
    ];
    const inputs = makeInputs(ds, reqs, [
      {
        id: 'transport-belt',
        durationModifier: { mode: 'raw', amount: 1 },
        outputModifier: { mode: 'raw', amount: 1 },
      },
    ]);

    const unknowns = computeUnknowns(inputs);
    expect(unknowns).toMatchSnapshot();

    reqs = applyHints(reqs, unknowns);
    expect(reqs).toMatchSnapshot();

    updateInputsWithHints(inputs, reqs, unknowns);
    expect({
      imports: inputs.imports,
      exports: inputs.exports,
    }).toMatchSnapshot();
  });
});
