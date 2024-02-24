import { useState } from 'preact/hooks';

import { DataSetPicker } from './components/data-set';
import { DataSetId, loadedDataSets } from './data';
import {
  Line,
  RequirementTable,
  Unknowns,
} from './components/requirement-table';
import { solve } from './backend/mgmt';
import { ItemPicker } from './components/item-picker';
import { ProcessPicker } from './components/process-picker';

export type ProcessId = string;

export interface Proc {
  id: ProcessId;
}

export const App = () => {
  const [dataSetId, setDataSetId] = useState<DataSetId | undefined>(undefined);
  const [requirements, setRequirements] = useState([] as Line[]);
  const [processes, setProcesses] = useState([] as Proc[]);

  const [processTerm, setProcessTerm] = useState('');

  const ppChange = (e: { currentTarget: HTMLInputElement }) =>
    setProcessTerm(e.currentTarget.value);

  const rows = [
    <div className={'col'}>
      <DataSetPicker
        onChange={(id) => {
          setDataSetId(id);
        }}
        value={dataSetId}
      />
    </div>,
  ];

  if (dataSetId) {
    const dataSet = loadedDataSets[dataSetId];

    let unknowns: Unknowns = {};
    if (requirements.length || processes.length) {
      unknowns = solve(dataSet, requirements, processes);
    }

    const renderReqs: Line[] = [];
    for (const line of requirements) {
      renderReqs.push({
        ...line,
        req: { ...line.req, hint: unknowns[line.item] },
      });
      delete unknowns[line.item];
    }

    for (const [item, req] of Object.entries(unknowns).sort()) {
      renderReqs.push({ item, req: { op: 'auto', amount: 1, hint: req } });
    }

    rows.push(
      <div class={'col'}>
        <RequirementTable
          dataSet={dataSet}
          value={renderReqs}
          onChange={setRequirements}
          findProc={(term) => setProcessTerm(term)}
        />
      </div>,
    );

    rows.push(
      <div class={'col'}>
        <h2>Processes</h2>
        <ul>
          {processes.map((proc) => (
            <li>{proc.id}</li>
          ))}
        </ul>
      </div>,
    );

    rows.push(
      <>
        <div class={'col'}>
          <ItemPicker
            dataSet={dataSet}
            picked={(item) => {
              setRequirements([
                ...requirements,
                { item, req: { op: 'produce', amount: 1 } },
              ]);
            }}
          />
        </div>
        <div class={'col'}>
          <p>
            <input
              type={'text'}
              className={'form-control'}
              placeholder={'Add process...'}
              onInput={ppChange}
              onKeyUp={ppChange}
              value={processTerm}
            />
          </p>
          <ProcessPicker
            dataSet={dataSet}
            term={processTerm}
            picked={(proc) => setProcesses([...processes, { id: proc }])}
          />
        </div>
      </>,
    );
  }

  return (
    <div class={'container-fluid'}>
      <div class={'row'}>
        <div class={'col'}>
          <h1>Process Management</h1>
        </div>
      </div>
      {rows.map((row) => (
        <div class={'row'}>{row}</div>
      ))}
    </div>
  );
};
