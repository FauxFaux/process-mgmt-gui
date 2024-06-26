import type { JSX } from 'preact';

import type { ProcessId } from '../app';
import type { DataSet } from '../data';
import type { Modifier, ModifierStyle } from '../modifiers';
import { modifierFromInput, modifierToInput } from '../modifiers';
import { Process } from './process';
import { Item, itemName } from './item';
import KnobIcon from 'mdi-preact/KnobIcon';
import ClockIcon from 'mdi-preact/ClockIcon';
import { roundTo, twoDp } from '../blurb/format';
import { mallAssembler } from '../bp';
import { encode } from '../bp/blueprints';
import ContentCopyIcon from 'mdi-preact/ContentCopyIcon';
import { useState } from 'preact/hooks';

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
  chain: {
    process_counts?: { [id: string]: number };
    processes: {
      id: string;
      factory_type?: {
        id: string;
        duration_modifier: number;
        output_modifier: number;
      };
    }[];
  };
}) => {
  const rows: JSX.Element[] = props.processes.map((proc, idx) => {
    const pm = props.dataSet.pm.processes[proc.id];
    const pmProc = props.chain.processes.find(({ id }) => id === proc.id);
    const inferredFactory = pmProc?.factory_type;

    const modDuration =
      (pm.duration / proc.durationModifier.amount) *
      (inferredFactory?.duration_modifier ?? 1);
    const modOutput =
      proc.outputModifier.amount * (inferredFactory?.output_modifier ?? 1);

    let make: string | undefined;
    if (pm.outputs.length === 1 && pm.factory_group.name === 'crafting') {
      const itemId = pm.outputs[0].item.id;
      make = encode(
        mallAssembler(
          pm.id,
          itemId,
          itemName(props.dataSet, itemId),
          Object.fromEntries(
            pm.inputs.map((s) => [s.item.id, Math.ceil(s.quantity * 1.1)]),
          ),
        ),
      );
    }

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
          <p>
            <Process dataSet={props.dataSet} id={proc.id} />
          </p>
          <p>
            <i>made in</i> {twoDp(props.chain.process_counts?.[proc.id] ?? 0)}{' '}
            &times;{' '}
            {inferredFactory ? (
              <Item dataSet={props.dataSet} id={inferredFactory.id} />
            ) : (
              pm.factory_group.name
            )}
            <span style={'margin-left: 1em'}>
              {make && (
                <CopyButton
                  text={make}
                  title={'Copy logistics-mall-style assembler to clipboard'}
                />
              )}
            </span>
          </p>
        </td>
        <td>
          <ClockIcon />{' '}
          <abbr title={'base duration from recipe'}>{pm.duration}s</abbr>{' '}
          {modDuration !== pm.duration && (
            <>
              &rArr;{' '}
              <abbr title={'after factory and module effects'}>
                {roundTo(modDuration, 2)}s
              </abbr>
            </>
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

const CopyButton = (props: { text: string; title?: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      class={'btn btn-sm btn-outline-secondary'}
      title={props.title}
      onClick={async () => {
        await navigator.clipboard.writeText(props.text);
        setCopied(true);
      }}
      onMouseLeave={() => setCopied(false)}
    >
      <ContentCopyIcon />
      {copied ? ' copied!' : ''}
    </button>
  );
};
