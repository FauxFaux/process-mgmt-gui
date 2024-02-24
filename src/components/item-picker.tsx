import { useRef, useState } from 'preact/hooks';

import type { DataSet } from '../data';
import { Item, ItemId } from './item';
import { JSX } from 'preact';
import PlusBoldIcon from 'mdi-preact/PlusBoldIcon';
import { regexpOrNot } from '../blurb/search';

export const ItemPicker = (props: {
  dataSet: DataSet;
  picked: (item: ItemId) => void;
}) => {
  const [results, setResults] = useState<ItemId[] | undefined>(undefined);
  const input = useRef<HTMLInputElement>(null);

  const change = (e: { currentTarget: HTMLInputElement }) => {
    const term = e.currentTarget.value;
    if (!term) {
      setResults(undefined);
      return;
    }
    const re = regexpOrNot(term);
    const matches = Object.keys(props.dataSet.pm.items).filter((item) =>
      re.test(item),
    );
    setResults(matches);
  };

  const form: JSX.Element[] = [
    <p>
      <input
        ref={input}
        type={'text'}
        className={'form-control'}
        placeholder={'Add item...'}
        onInput={change}
        onKeyUp={change}
      />
    </p>,
  ];
  if (results) {
    const lines = results.map((item) => {
      return (
        <li>
          <button
            class={'btn btn-sm btn-outline-secondary'}
            onClick={(e) => {
              e.preventDefault();
              props.picked(item);
              input.current?.select();
              input.current?.focus();
            }}
          >
            <PlusBoldIcon />
          </button>
          <Item dataSet={props.dataSet} id={item} />
        </li>
      );
    });
    form.push(<ul>{lines}</ul>);
  }

  return <>{form}</>;
};
