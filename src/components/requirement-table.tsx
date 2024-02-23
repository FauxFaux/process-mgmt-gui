import { DataSet } from '../data';
import { ItemPicker } from './item-picker';
import { Item, ItemId } from './item';
import { JSX } from 'preact';
import MinusIcon from 'mdi-preact/MinusIcon';

// amount is only relevant for 'produce' but it's nice to persist it even if someone clicks away
type Req = { amount: number; op: 'import' | 'export' | 'produce' };

export interface Line {
  item: ItemId;
  req: Req;
}

interface Props {
  value: Line[];
  dataSet: DataSet;
  onChange: (value: Line[]) => void;
}

const MutReq = (props: {
  formKey: string;
  req: Req;
  onChange: (req: Req) => void;
}) => {
  const radio = `mut-req-radio-${props.formKey}`;
  const list: JSX.Element[] = (['import', 'export', 'produce'] as const).map(
    (op, i) => {
      return (
        <>
          <input
            type="radio"
            className="btn-check"
            name={radio}
            id={`${radio}-${i}`}
            autoComplete="off"
            checked={props.req.op === op}
            onChange={() => props.onChange({ ...props.req, op })}
          />
          <label className="btn btn-outline-primary" htmlFor={`${radio}-${i}`}>
            {op}
          </label>
        </>
      );
    },
  );

  return (
    <div
      class="btn-group"
      role="group"
      aria-label="Basic radio toggle button group"
    >
      {list}

      <input
        className={'form-control form-control-sm req__produce'}
        type={'number'}
        value={props.req.amount}
        onChange={(e: { currentTarget: HTMLInputElement }) =>
          props.onChange({
            ...props.req,
            amount: parseFloat(e.currentTarget.value),
          })
        }
        min={0}
        step={'any'}
        disabled={props.req.op !== 'produce'}
      />
    </div>
  );
};

export const RequirementTable = (props: Props) => {
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
                class={'btn btn-sm btn-outline-secondary'}
                onClick={() => {
                  props.onChange(
                    props.value.filter((l) => l.item !== line.item),
                  );
                }}
              >
                <MinusIcon />
              </button>
            </td>
            <td>
              <Item dataSet={props.dataSet} id={line.item} />
            </td>
            <td>
              <MutReq
                formKey={`html-only-${line.item}`}
                req={line.req}
                onChange={(req) => {
                  // TODO: surely we don't need to do this?
                  props.onChange(
                    props.value.map((l) =>
                      l.item === line.item ? { ...l, req } : l,
                    ),
                  );
                }}
              />
            </td>
          </tr>
        ))}
        <tr>
          <td colSpan={3}>
            <ItemPicker
              dataSet={props.dataSet}
              picked={(item) => {
                props.onChange([
                  ...props.value,
                  { item, req: { op: 'produce', amount: 1 } },
                ]);
              }}
            />
          </td>
        </tr>
      </tbody>
    </table>
  );
};
