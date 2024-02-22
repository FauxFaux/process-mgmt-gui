import { useState } from 'preact/hooks';
import { DataSet, DataSetId, dataSets, loadDataSet } from '../data';

export interface Props {
  value: DataSetId | undefined;
  onChange: (value: DataSetId, ds: DataSet) => void;
}

type Loading =
  | { state: 'waiting' }
  | { state: 'loading'; id: DataSetId }
  | { state: 'done'; id: DataSetId };

export const DataSetPicker = (props: Props) => {
  const [loading, setLoading] = useState<Loading>({ state: 'waiting' });
  if (loading.state === 'loading') {
    return <div>Loading {loading.id}...</div>;
  }

  const current = props.value && dataSets[props.value][0];

  const onChange = (e: { currentTarget: HTMLSelectElement }) => {
    const next = e.currentTarget.value as DataSetId;
    if (!next) return;
    (async () => {
      const ds = await loadDataSet(next);
      setLoading({ state: 'done', id: next });
      props.onChange(next, ds);
    })();
    setLoading({ state: 'loading', id: next });
  };

  return (
    <p>
      <select value={props.value} onChange={onChange}>
        {!props.value && <option value={''}>Select a data set...</option>}
        {Object.entries(dataSets).map(([id, [name]]) => (
          <option value={id}>{name}</option>
        ))}
      </select>
      {current && <span>Current: {current}</span>}
    </p>
  );
};
