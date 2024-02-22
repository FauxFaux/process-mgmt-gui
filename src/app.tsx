import { useState } from 'preact/hooks';

import { DataSetPicker } from './components/data-set';
import { DataSetId, loadedDataSets } from './data';
import { Line, RequirementTable } from './components/requirement-table';

export const App = () => {
  const [dataSetId, setDataSetId] = useState<DataSetId | undefined>(undefined);
  const [requirements, setRequirements] = useState([] as Line[]);

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
