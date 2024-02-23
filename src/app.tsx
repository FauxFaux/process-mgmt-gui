import { useState } from 'preact/hooks';

import { DataSetPicker } from './components/data-set';
import { DataSetId, loadedDataSets } from './data';
import { Line, RequirementTable } from './components/requirement-table';
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
    rows.push(
      <div class={'col'}>
        <RequirementTable
          dataSet={dataSet}
          value={requirements}
          onChange={setRequirements}
        />
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
          <ProcessPicker
            dataSet={dataSet}
            picked={(proc) => setProcesses([...processes, { id: proc }])}
          />
        </div>
      </>,
    );

    if (requirements.length || processes.length) {
      console.log(solve(dataSet, requirements, processes));
    }
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
