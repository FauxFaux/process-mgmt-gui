import { DataSet } from '../data';
import { Item, ItemId } from './item';
import { JSX } from 'preact';
import MagnifyIcon from 'mdi-preact/MagnifyIcon';
import MagnifyAddIcon from 'mdi-preact/MagnifyAddIcon';
import MagnifyMinusIcon from 'mdi-preact/MagnifyMinusIcon';

export type Unknowns = Record<ItemId, 'import' | 'export'>;

// amount is only relevant for 'produce' but it's nice to persist it even if someone clicks away
type Req = {
  amount: number;
  op: 'auto' | 'import' | 'export' | 'produce';
  hint?: Unknowns[ItemId];
};

export interface Line {
  item: ItemId;
  req: Req;
}

interface Props {
  value: Line[];
  dataSet: DataSet;
  onChange: (value: Line[]) => void;
  findProc: (term: string) => void;
}

const MutReq = (props: {
  formKey: string;
  req: Req;
  onChange: (req: Req) => void;
}) => {
  const radio = `mut-req-radio-${props.formKey}`;
  const list: JSX.Element[] = (
    ['auto', 'import', 'export', 'produce'] as const
  ).map((op, i) => {
    const hinted = props.req.op === 'auto' && props.req.hint === op;
    const helpText = {
      auto: 'import or export based on apparent usage',
      import: 'this item magically appears to be used; perhaps by train',
      export: 'this item magically disappears; perhaps by train',
      produce: 'this item is what we actually want, at some rate',
    };
    const title = hinted
      ? 'auto has automatically selected this value'
      : helpText[op];
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
          title={title}
        />
        <label
          className={
            'btn btn-outline-primary ' + (hinted ? 'req__radio--auto' : '')
          }
          htmlFor={`${radio}-${i}`}
          title={title}
        >
          {op}
        </label>
      </>
    );
  });

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
  const hintColour = (req: Req, forCode: 'import' | 'export') =>
    req.hint === forCode && !(forCode === 'export' && req.op === 'produce')
      ? 'btn-warning'
      : 'btn-secondary';

  return (
    <table class={'table req__main-table'}>
      <thead>
        <tr>
          <th>Item</th>
          <th>Settings</th>
        </tr>
      </thead>
      <tbody>
        {props.value.map((line) => (
          <tr>
            <td>
              <Item dataSet={props.dataSet} id={line.item} />
            </td>
            <td>
              <button
                className={'btn req__find ' + hintColour(line.req, 'export')}
                onClick={() => props.findProc(`c:${line.item}`)}
                title={'find consumer'}
              >
                <MagnifyMinusIcon />
                <span className={'req__find_label'}>find consumer</span>
              </button>
              <button
                className={'btn req__find ' + hintColour(line.req, 'import')}
                onClick={() => props.findProc(`p:${line.item}`)}
                title={'find producer'}
              >
                <MagnifyAddIcon />
                <span class={'req__find_label'}>find producer</span>
              </button>
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
      </tbody>
    </table>
  );
};
