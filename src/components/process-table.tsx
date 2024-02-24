import { JSX } from 'preact';

import { ProcessId } from '../app';
import { DataSet } from '../data';
import { ModifierStyle } from '../modifiers';
import { Process } from './process';
import { Item } from './item';
import KnobIcon from 'mdi-preact/KnobIcon';

export interface Modifier {
  mode: ModifierStyle;
  amount: number;
}

export interface Proc {
  id: ProcessId;
  durationModifier: Modifier;
  outputModifier: Modifier;
}

export const ProcessTable = (props: {
  dataSet: DataSet;
  processes: Proc[];
  onChange: (processes: Proc[]) => void;
}) => {
  const rows: JSX.Element[] = props.processes.map((proc, idx) => {
    const pm = props.dataSet.pm.processes[proc.id];
    return (
      <tr>
        <td>
          <button
            class={'btn btn-sm btn-outline-danger'}
            onClick={() => {
              const processes = [...props.processes];
              processes.splice(idx, 1);
              props.onChange(processes);
            }}
          >
            -
          </button>
        </td>
        <td>
          <Process dataSet={props.dataSet} id={proc.id} />
        </td>
        <td>{pm.factory_group.id}</td>
        <td>
          {pm.duration}s{' '}
          <MutModifier
            cfg={proc.durationModifier}
            onChange={(mod) => {
              const processes = [...props.processes];
              processes[idx] = { ...proc, durationModifier: mod };
              props.onChange(processes);
            }}
          />{' '}
          = {pm.duration * proc.durationModifier.amount}s
        </td>
        <td>
          <ul>
            {pm.inputs.map((stack) => {
              return (
                <li>
                  {stack.quantity}{' '}
                  <Item dataSet={props.dataSet} id={stack.item.id} />
                </li>
              );
            })}
          </ul>
        </td>
        <td>
          <MutModifier
            cfg={proc.outputModifier}
            onChange={(mod) => {
              const processes = [...props.processes];
              processes[idx] = { ...proc, outputModifier: mod };
              props.onChange(processes);
            }}
          />
          <ul>
            {pm.outputs.map((stack) => {
              return (
                <li>
                  {stack.quantity}{' '}
                  <Item dataSet={props.dataSet} id={stack.item.id} />
                </li>
              );
            })}
          </ul>
        </td>
      </tr>
    );
  });
  return (
    <table class={'table'}>
      <thead>
        <tr>
          <th />
          <th>Process</th>
          <th>Machine</th>
          <th>Duration</th>
          <th>Input</th>
          <th>Output</th>
        </tr>
      </thead>
      <tbody>{rows}</tbody>
    </table>
  );
};

const MutModifier = (props: {
  cfg: Modifier;
  onChange: (mod: Modifier) => void;
}) => {
  const sel = (
    <select
      class={'form-select form-select-sm proc__mod-style'}
      value={props.cfg.mode}
      onChange={(e) =>
        props.onChange({
          ...props.cfg,
          mode: e.currentTarget.value as ModifierStyle,
        })
      }
    >
      <option value={'raw'}>&times; raw value (5 &times; 1.4 = 7)</option>
      <option value={'normal'}>@ percentage (5 @ 140% = 7)</option>
      <option value={'additional'}>
        &plusmn; additional percentage (5 + 40% = 7)
      </option>
    </select>
  );

  const inp = (
    <input
      className={'form-control form-control-sm proc__mod-amount'}
      type="number"
      value={props.cfg.amount}
      onChange={(e) =>
        props.onChange({
          ...props.cfg,
          amount: parseFloat(e.currentTarget.value),
        })
      }
      step={'any'}
    />
  );

  const suffix = {
    raw: 'x',
    normal: '%',
    additional: '%',
  }[props.cfg.mode];
  return (
    <span
      title={
        "configure a nudge (it's supposed to be a volume knob, I know, I know)"
      }
    >
      <KnobIcon /> {sel}
      {inp}
      <span style={'font-family: monospace'}>{suffix}</span>
    </span>
  );
};
