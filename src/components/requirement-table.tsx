import { DataSet } from '../data';
import { useState } from 'preact/hooks';

type ItemId = string;
type Req =
  | { op: 'import' }
  | { op: 'export' }
  | { op: 'produce'; amount: number };

export interface Line {
  item: ItemId;
  req: Req;
}

interface Props {
  value: Line[];
  dataSet: DataSet;
  onChange: (value: Line[]) => void;
}

export const RequirementTable = (props: Props) => {
  const [results, setResults] = useState<ItemId[] | undefined>(undefined);

  const change = (e: { currentTarget: HTMLInputElement }) => {
    const term = e.currentTarget.value;
    if (!term) {
      setResults(undefined);
      return;
    }
    const re = new RegExp(`.*${term}.*`, 'i');
    const matches = Object.keys(props.dataSet.items).filter((item) =>
      re.test(item),
    );
    setResults(matches);
  };

  return (
    <table class={'table'}>
      <thead>
        <tr>
          <th />
          <th>Item</th>
          <th>Demand</th>
        </tr>
      </thead>
      <tbody>
        {props.value.map((line) => (
          <tr>
            <td>
              <button
                onClick={() => {
                  props.onChange(
                    props.value.filter((l) => l.item !== line.item),
                  );
                }}
              >
                X
              </button>
            </td>
            <td>{line.item}</td>
            <td>{JSON.stringify(line.req)}</td>
          </tr>
        ))}
        <tr>
          <td colSpan={3}>
            <input
              type={'text'}
              class={'form-control'}
              placeholder={'Add new...'}
              onInput={change}
              onKeyUp={change}
            />
            {results !== undefined && (
              <ul>
                {results.map((item) => (
                  <li>
                    <button
                      onClick={() => {
                        props.onChange([
                          ...props.value,
                          { item, req: { op: 'import' } },
                        ]);
                        setResults(undefined);
                      }}
                    >
                      {item}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              onClick={() => {
                props.onChange([
                  ...props.value,
                  { item: '', req: { op: 'import' } },
                ]);
              }}
            >
              Add
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  );
};
