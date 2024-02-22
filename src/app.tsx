import { useState } from 'preact/hooks';

import { DataSetPicker } from './components/data-set';
import { DataSetId } from './data';

export const App = () => {
  const [dataSetId, setDataSetId] = useState<DataSetId | undefined>(undefined);

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
            onChange={(id) => {
              setDataSetId(id);
            }}
            value={dataSetId}
          />
        </div>
      </div>
    </div>
  );
};
