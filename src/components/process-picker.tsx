import { useRef, useState } from 'preact/hooks';

import type { DataSet } from '../data';
import { JSX } from 'preact';
import PlusBoldIcon from 'mdi-preact/PlusBoldIcon';
import { Process } from './process';
import { Item } from './item';

export type ProcessId = string;

export const ProcessPicker = (props: {
  dataSet: DataSet;
  picked: (item: ProcessId) => void;
}) => {
  const [results, setResults] = useState<ProcessId[] | undefined>(undefined);
  const input = useRef<HTMLInputElement>(null);

  const change = (e: { currentTarget: HTMLInputElement }) => {
    const term = e.currentTarget.value;
    if (!term) {
      setResults(undefined);
      return;
    }
    if (term.startsWith('p:')) {
      const wantId = term.slice(2);
      setResults(
        Object.entries(props.dataSet.pm.processes)
          .filter(([, p]) => p.outputs.some((o) => o.item.id === wantId))
          .map(([id]) => id),
      );
    } else if (term.startsWith('c:')) {
      const wantId = term.slice(2);
      setResults(
        Object.entries(props.dataSet.pm.processes)
          .filter(([, p]) => p.inputs.some((o) => o.item.id === wantId))
          .map(([id]) => id),
      );
    } else {
      const re = new RegExp(`.*${term}.*`, 'i');
      const matches = Object.keys(props.dataSet.pm.processes).filter((item) =>
        re.test(item),
      );
      setResults(matches);
    }
  };

  const form: JSX.Element[] = [
    <p>
      <input
        ref={input}
        type={'text'}
        className={'form-control'}
        placeholder={'Add process...'}
        onInput={change}
        onKeyUp={change}
      />
    </p>,
  ];
  if (results) {
    const lines = results.map((process) => {
      const obj = props.dataSet.pm.processes[process];
      return (
        <li>
          <button
            class={'btn btn-sm btn-outline-secondary'}
            onClick={(e) => {
              e.preventDefault();
              props.picked(process);
              input.current?.select();
              input.current?.focus();
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
    form.push(<ul>{lines}</ul>);
  }

  return <>{form}</>;
};
