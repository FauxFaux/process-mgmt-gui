import { JSX } from 'preact';

import { ProcessId } from '../app';
import { DataSet } from '../data';
import {
  Modifier,
  modifierFromInput,
  ModifierStyle,
  modifierToInput,
} from '../modifiers';
import { Process } from './process';
import { Item } from './item';
import KnobIcon from 'mdi-preact/KnobIcon';
import ClockIcon from 'mdi-preact/ClockIcon';
import { roundTo } from '../blurb/format';

export interface Proc {
  id: ProcessId;
  durationModifier: Modifier;
  outputModifier: Modifier;
}

export const applyModifier = (mod: Modifier, value: number) => {
  switch (mod.mode) {
    case 'raw':
      return value * mod.amount;
    case 'normal':
      return value * (mod.amount / 100);
    case 'additional':
      return value * (1 + mod.amount / 100);
    default:
      throw new Error(`unknown mode: ${mod.mode}`);
  }
};

export const ProcessTable = (props: {
  dataSet: DataSet;
  processes: Proc[];
  onChange: (processes: Proc[]) => void;
}) => {
  const rows: JSX.Element[] = props.processes.map((proc, idx) => {
    const pm = props.dataSet.pm.processes[proc.id];
    const modDuration = pm.duration / proc.durationModifier.amount;
    const modOutput = proc.outputModifier.amount;
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
          <ClockIcon /> {pm.duration}s{' '}
          {modDuration !== pm.duration && (
            <>&rArr; {roundTo(modDuration, 2)}s</>
          )}
          <br />
          <MutModifier
            cfg={proc.durationModifier}
            onChange={(mod) => {
              const processes = [...props.processes];
              processes[idx] = { ...proc, durationModifier: mod };
              props.onChange(processes);
            }}
          />
        </td>
        <td>
          <ul class={'item-list'}>
            {pm.inputs.map((stack) => {
              return (
                <li>
                  <span class={'quantity'}>{stack.quantity}</span>
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
          <table className={'item-table'}>
            <tbody>
              {pm.outputs.map((stack) => {
                return (
                  <tr>
                    <td class={'quantity'}>
                      {stack.quantity} {modOutput !== 1 && <>&rArr;</>}
                    </td>
                    {modOutput !== 1 && (
                      <td class={'quantity'}>
                        {roundTo(stack.quantity * modOutput, 2)}
                      </td>
                    )}
                    <td>
                      <Item dataSet={props.dataSet} id={stack.item.id} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
  disabled?: true;
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
      disabled={props.disabled}
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
      value={roundTo(modifierToInput(props.cfg), 4)}
      onChange={(e) => {
        const input = parseFloat(e.currentTarget.value);
        props.onChange(modifierFromInput(props.cfg.mode, input));
      }}
      step={'any'}
      disabled={props.disabled}
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
