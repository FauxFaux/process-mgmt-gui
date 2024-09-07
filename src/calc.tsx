import type { JSX } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import type { Viz } from '@viz-js/viz';

import type { Factory } from 'process-mgmt/dist/factory';
import type { Process } from 'process-mgmt/dist/process';
import type Matrix from 'process-mgmt/dist/matrix';

import type { DataSet } from './data';
import type { Hint, Line, Req, Unknowns } from './components/requirement-table';
import { RequirementTable } from './components/requirement-table';
import {
  applyHints,
  computeUnknowns,
  mainSolve,
  makeInputs,
  updateInputsWithHints,
} from './backend/mgmt';
import { ProcessPicker } from './components/process-picker';
import type { Proc } from './components/process-table';
import { ProcessTable } from './components/process-table';
import type { Modifier } from './modifiers';
import { GroupPrefPicker } from './components/group-pref-picker';

import ArrowRightIcon from 'mdi-preact/ArrowRightIcon';
import PlusBoldIcon from 'mdi-preact/PlusBoldIcon';
import PinIcon from 'mdi-preact/PinIcon';
import ArrowDownIcon from 'mdi-preact/ArrowDownIcon';
import { FlowSvg } from './components/flow-svg';

export type GroupPref = Record<Process['factory_group']['id'], Factory['id']>;

export interface CalcState {
  requirements: Line[];
  processes: Proc[];
  defaultGroupPref: GroupPref;
}

export const Calc = (props: {
  dataSet: DataSet;
  viz: Viz;
  state: CalcState;
  setState: (next: CalcState) => void;
}) => {
  const { requirements, processes, defaultGroupPref } = props.state;

  const setState = (
    inpReqs: Line[],
    processes: Proc[],
    defaultGroupPref: GroupPref,
  ) => {
    const unknowns = unknownsFromInternal(
      props.dataSet,
      inpReqs,
      processes,
      defaultGroupPref,
    );
    const requirements = applyHints(inpReqs, unknowns);
    props.setState({ requirements, processes, defaultGroupPref });
  };

  const setRequirements = (requirements: Line[]) =>
    setState(requirements, processes, defaultGroupPref);
  const setProcesses = (processes: Proc[]) =>
    setState(requirements, processes, defaultGroupPref);

  const setGroupPrefs = (defaultGroupPref: GroupPref) =>
    setState(requirements, processes, defaultGroupPref);

  const unknowns = useMemo(
    () =>
      unknownsFromInternal(
        props.dataSet,
        requirements,
        processes,
        defaultGroupPref,
      ),
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

  const preSolve = useMemo(() => {
    if (!processes.length) {
      return undefined;
    }

    const inputs = makeInputs(
      props.dataSet,
      requirements,
      processes,
      defaultGroupPref,
    );
    updateInputsWithHints(inputs, requirements, unknowns);
    return mainSolve(inputs);
  }, [processes, props.dataSet, requirements, unknowns]);

  if (preSolve?.chain) {
    const rm: Matrix | undefined = preSolve.lav?.reduced_matrix;
    if (rm?.numRows() !== rm?.numColumns() - 1) {
      rows.push(
        <div class={'col'}>
          <p class={'alert alert-danger'}>
            Rectangular matrix detected! This likely means the backend has
            produced a nonsense result. Consider pinning inputs of confused
            processes.
          </p>
        </div>,
      );
    }
    rows.push(
      <div class={'col'}>
        <ProcessTable
          dataSet={dataSet}
          processes={processes}
          onChange={(procs) => setProcesses(procs)}
          chain={preSolve.chain}
        />
      </div>,
    );

    rows.push(
      <GroupPrefPicker
        dataSet={dataSet}
        processes={processes}
        groupPrefs={defaultGroupPref}
        setGroupPrefs={setGroupPrefs}
      />,
    );
  }

  if (preSolve?.chain) {
    rows.push(
      <FlowSvg
        dataSet={props.dataSet}
        chain={preSolve.chain}
        viz={props.viz}
      />,
    );
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
  defaultFactoryGroups: GroupPref,
): Unknowns => {
  const fallbackMapping: Record<Req['op'], Hint> = {
    import: 'import',
    export: 'export',
    produce: 'export',
    // unreachable
    auto: 'import',
  };

  if (processes.length) {
    const inputs = makeInputs(
      dataSet,
      requirements,
      processes,
      defaultFactoryGroups,
    );
    return computeUnknowns(inputs);
  }
  return Object.fromEntries(
    requirements.map(
      (line) => [line.item, fallbackMapping[line.req.op]] as const,
    ),
  );
};
