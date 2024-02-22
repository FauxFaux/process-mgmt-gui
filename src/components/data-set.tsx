import { useState } from 'preact/hooks';
import { DataSetId, dataSets, loadDataSet } from '../data';

export interface Props {
  value: DataSetId | undefined;
  onChange: (value: DataSetId | undefined) => void;
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
      await loadDataSet(next);
      setLoading({ state: 'done', id: next });
      props.onChange(next);
    })();
    setLoading({ state: 'loading', id: next });
  };

  let select = (
    <select class={'form-control'} value={props.value} onChange={onChange}>
      {!props.value && <option value={''}>Select a data set...</option>}
      {Object.entries(dataSets).map(([id, [name]]) => (
        <option value={id}>{name}</option>
      ))}
    </select>
  );
  return (
    <p>
      <form>
        <div className="form-group">{select}</div>
        <div className="form-group">
          {current && <span>Current: {current}</span>}
        </div>
      </form>
    </p>
  );
};
