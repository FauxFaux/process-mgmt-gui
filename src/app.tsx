import { useState } from 'preact/hooks';

import { DataSetPicker } from './components/data-set';
import { DataSet, DataSetId } from './data';

export const App = () => {
  const [dataSetId, setDataSetId] = useState<DataSetId | undefined>(undefined);
  const [dataSet, setDataSet] = useState<DataSet | undefined>(undefined);

  return (
    <div class={'container-fluid'}>
      <div class={'row'}>
        <div class={'col'}>
          <h1>Process Management</h1>
        </div>
      </div>
      <div class={'row'}>
        <div class={'col'}>
          <DataSetPicker
            onChange={(id, ds) => {
              setDataSetId(id);
              setDataSet(ds);
            }}
            value={dataSetId}
          />
        </div>
      </div>
    </div>
  );
};
