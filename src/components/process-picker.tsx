import type { DataSet } from '../data';
import PlusBoldIcon from 'mdi-preact/PlusBoldIcon';
import { Process } from './process';
import { Item } from './item';

export type ProcessId = string;

export const ProcessPicker = (props: {
  dataSet: DataSet;
  term: string;
  picked: (item: ProcessId) => void;
}) => {
  const term = props.term;
  if (!term) return <></>;

  let results: ProcessId[];

  if (term.startsWith('p:')) {
    const wantId = term.slice(2);
    results = Object.entries(props.dataSet.pm.processes)
      .filter(([, p]) => p.outputs.some((o) => o.item.id === wantId))
      .map(([id]) => id);
  } else if (term.startsWith('c:')) {
    const wantId = term.slice(2);
    results = Object.entries(props.dataSet.pm.processes)
      .filter(([, p]) => p.inputs.some((o) => o.item.id === wantId))
      .map(([id]) => id);
  } else {
    const re = new RegExp(`.*${term}.*`, 'i');
    results = Object.keys(props.dataSet.pm.processes).filter((item) =>
      re.test(item),
    );
  }

  const lines = results.map((process) => {
    const obj = props.dataSet.pm.processes[process];
    return (
      <li>
        <button
          class={'btn btn-sm btn-outline-secondary'}
          onClick={(e) => {
            e.preventDefault();
            props.picked(process);
          }}
        >
          <PlusBoldIcon />
        </button>
        <Process dataSet={props.dataSet} id={process} />{' '}
        {!!obj.inputs.length && (
          <>
            <i>from</i>{' '}
            {obj.inputs.map(({ item }) => (
              <Item dataSet={props.dataSet} id={item.id} justIcon={true} />
            ))}
          </>
        )}
      </li>
    );
  });

  return <ul>{lines}</ul>;
};
