import type { JSX } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import type { Viz } from '@viz-js/viz';

import type { DataSet } from './data';
import type { Hint, Line, Req, Unknowns } from './components/requirement-table';
import { RequirementTable } from './components/requirement-table';
import {
  applyHints,
  computeUnknowns,
  dotFor,
  makeInputs,
  updateInputsWithHints,
} from './backend/mgmt';
import { ProcessPicker } from './components/process-picker';

import type { Proc } from './components/process-table';
import { ProcessTable } from './components/process-table';
import ArrowRightIcon from 'mdi-preact/ArrowRightIcon';
import type { Modifier } from './modifiers';
import PlusBoldIcon from 'mdi-preact/PlusBoldIcon';
import PinIcon from 'mdi-preact/PinIcon';
import ArrowDownIcon from 'mdi-preact/ArrowDownIcon';

export interface CalcState {
  requirements: Line[];
  processes: Proc[];
}

export const Calc = (props: {
  dataSet: DataSet;
  viz: Viz;
  state: CalcState;
  setState: (next: CalcState) => void;
}) => {
  const { requirements, processes } = props.state;

  const setState = (inpReqs: Line[], processes: Proc[]) => {
    const unknowns = unknownsFromInternal(props.dataSet, inpReqs, processes);
    const requirements = applyHints(inpReqs, unknowns);
    props.setState({ requirements, processes });
  };

  const setRequirements = (requirements: Line[]) =>
    setState(requirements, processes);
  const setProcesses = (processes: Proc[]) => setState(requirements, processes);

  const unknowns = useMemo(
    () => unknownsFromInternal(props.dataSet, requirements, processes),
    [props.dataSet, requirements, processes],
  );

  const [processTerm, setProcessTerm] = useState('');
  const [processShown, setProcessShown] = useState(6);

  const ppChange = (e: { currentTarget: HTMLInputElement }) => {
    setProcessShown(6);
    setProcessTerm(e.currentTarget.value);
  };

  const rows: JSX.Element[] = [];

  const dataSet = props.dataSet;

  const defaultMod = (): Modifier => ({
    mode: 'additional',
    amount: 1,
  });

  const searchContent = (
    <div>
      <p>
        <input
          type={'search'}
          className={'form-control'}
          placeholder={'Add by item name, process name, or internal ids...'}
          onInput={ppChange}
          onKeyUp={ppChange}
          value={processTerm}
        />
      </p>
      <ProcessPicker
        dataSet={dataSet}
        term={processTerm}
        picked={(proc) =>
          setProcesses([
            ...processes,
            {
              id: proc,
              durationModifier: defaultMod(),
              outputModifier: defaultMod(),
            },
          ])
        }
        pinItem={(item) => {
          setRequirements([
            ...requirements,
            { item, req: { op: 'produce', amount: 1 } },
          ]);
        }}
        alreadyProc={(proc) => processes.some((p) => p.id === proc)}
        alreadyItem={(item) => requirements.some((r) => r.item === item)}
        shown={[processShown, setProcessShown]}
      />
    </div>
  );

  const anyProduction = requirements.some(
    (req) => req.req.op === 'produce' && req.req.amount !== 0,
  );
  const noProductionWarning = processes.length !== 0 && !anyProduction && (
    <div className="alert alert-warning" role="alert">
      No production requirements are specified. You must have at least one item
      set to "produce" more than zero items for a calculation to occur.
    </div>
  );

  const table = requirements.length ? (
    <RequirementTable
      dataSet={dataSet}
      value={requirements}
      hints={unknowns}
      onChange={setRequirements}
      findProc={(term) => setProcessTerm(term)}
    />
  ) : (
    <div
      className="alert alert-primary welcome-help"
      role="alert"
      style={'text-align: right'}
    >
      <p>
        Add a process to get started
        <span class={'d-none d-xxl-inline'}>
          <ArrowRightIcon />
        </span>
        <span class={'d-xxl-none'}>
          <ArrowDownIcon />
        </span>
      </p>
      <p>
        This button will <i>add</i> the process/recipe, and all its associated
        items:{' '}
        <button className={'btn btn-sm btn-outline-secondary'} disabled={true}>
          <PlusBoldIcon />
        </button>
      </p>
      <p>
        This button will <i>pin</i> the item to the requirements list, if you
        have somehow managed to lose it:{' '}
        <button className={'btn btn-sm btn-outline-secondary'} disabled={true}>
          <PinIcon />
        </button>
      </p>
    </div>
  );

  rows.push(
    <>
      <div className={'col-xxl-8'}>
        {noProductionWarning}
        {table}
      </div>
      <div className={'col-xxl-4'}>{searchContent}</div>
    </>,
  );

  if (processes.length) {
    rows.push(
      <div class={'col'}>
        <ProcessTable
          dataSet={dataSet}
          processes={processes}
          onChange={(procs) => setProcesses(procs)}
        />
      </div>,
    );
  }

  if (processes.length) {
    const inputs = makeInputs(props.dataSet, requirements, processes);
    updateInputsWithHints(inputs, requirements, unknowns);
    const dot = dotFor(props.dataSet, inputs);
    console.log(dot);
    const svg = props.viz.renderString(dot, {
      engine: 'dot',
      format: 'svg',
    });
    rows.push(<div dangerouslySetInnerHTML={{ __html: svg }} />);
  }

  return (
    <div class={'container-fluid'}>
      {rows.map((row) => (
        <div class={'row'}>{row}</div>
      ))}
    </div>
  );
};

const unknownsFromInternal = (
  dataSet: DataSet,
  requirements: Line[],
  processes: Proc[],
): Unknowns => {
  const fallbackMapping: Record<Req['op'], Hint> = {
    import: 'import',
    export: 'export',
    produce: 'export',
    // unreachable
    auto: 'import',
  };

  if (processes.length) {
    const inputs = makeInputs(dataSet, requirements, processes);
    return computeUnknowns(inputs);
  }
  return Object.fromEntries(
    requirements.map(
      (line) => [line.item, fallbackMapping[line.req.op]] as const,
    ),
  );
};
