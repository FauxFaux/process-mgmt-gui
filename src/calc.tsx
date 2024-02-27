import type { JSX } from 'preact';
import { useState } from 'preact/hooks';
import type { Viz } from '@viz-js/viz';

import type { DataSet } from './data';
import type { Line, Unknowns } from './components/requirement-table';
import { RequirementTable } from './components/requirement-table';
import { solve } from './backend/mgmt';
import { ItemPicker } from './components/item-picker';
import { ProcessPicker } from './components/process-picker';

import type { Proc } from './components/process-table';
import { ProcessTable } from './components/process-table';
import ArrowRightIcon from 'mdi-preact/ArrowRightIcon';
import type { Modifier } from './modifiers';

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
  const setRequirements = (requirements: Line[]) =>
    props.setState({ ...props.state, requirements });
  const setProcesses = (processes: Proc[]) =>
    props.setState({ ...props.state, processes });

  const [processTerm, setProcessTerm] = useState('');
  const [searchTab, setSearchTab] = useState('process' as 'process' | 'item');

  const ppChange = (e: { currentTarget: HTMLInputElement }) =>
    setProcessTerm(e.currentTarget.value);

  const rows: JSX.Element[] = [];

  const dataSet = props.dataSet;

  const fallbackMapping = {
    import: 'import',
    export: 'export',
    produce: 'export',
    // unreachable
    auto: 'import',
  };

  const { unknowns, dot } = processes.length
    ? solve(dataSet, requirements, processes)
    : {
        unknowns: Object.fromEntries(
          requirements.map(
            (line) => [line.item, fallbackMapping[line.req.op]] as const,
          ),
        ) as Unknowns,
        dot: undefined,
      };

  const renderReqs: Line[] = [];
  for (const line of requirements) {
    if (line.req.op === 'auto' && !unknowns[line.item]) {
      continue;
    }
    renderReqs.push({
      ...line,
      req: { ...line.req, hint: unknowns[line.item] },
    });
    delete unknowns[line.item];
  }

  const noExistingReqs = renderReqs.length === 0;

  // place 'export's (recipe outputs) before imports where possible
  for (const req of ['export', 'import'] as const) {
    for (const [item] of Object.entries(unknowns)
      .filter(([, unk]) => unk === req)
      .sort()) {
      const op = req === 'export' && noExistingReqs ? 'produce' : 'auto';
      renderReqs.push({ item, req: { op, amount: 1, hint: req } });
    }
  }

  const defaultMod = (): Modifier => ({
    mode: 'additional',
    amount: 1,
  });

  let searchContent = <></>;

  switch (searchTab) {
    case 'process':
      searchContent = (
        <div>
          <p>
            <input
              type={'text'}
              className={'form-control'}
              placeholder={'Add process...'}
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
          />
        </div>
      );
      break;
    case 'item':
      searchContent = (
        <ItemPicker
          dataSet={dataSet}
          picked={(item) => {
            setRequirements([
              ...requirements,
              { item, req: { op: 'produce', amount: 1 } },
            ]);
          }}
        />
      );
      break;
    default:
      throw new Error('unknown search tab: ' + searchTab);
  }

  const searchTabs = (
    <>
      <ul className="nav nav-tabs">
        <li className="nav-item">
          <a
            className={'nav-link ' + (searchTab === 'process' ? 'active' : '')}
            onClick={(e) => {
              e.preventDefault();
              setSearchTab('process');
            }}
            href={'#'}
          >
            Processes
          </a>
        </li>
        <li className="nav-item">
          <a
            className={'nav-link ' + (searchTab === 'item' ? 'active' : '')}
            onClick={(e) => {
              e.preventDefault();
              setSearchTab('item');
            }}
            href={'#'}
          >
            Items
          </a>
        </li>
      </ul>
      {searchContent}
    </>
  );

  const anyProduction = renderReqs.some(
    (req) => req.req.op === 'produce' && req.req.amount !== 0,
  );
  const noProductionWarning = processes.length !== 0 && !anyProduction && (
    <div className="alert alert-warning" role="alert">
      No production requirements are specified. You must have at least one item
      set to "produce" more than zero items for a calculation to occur.
    </div>
  );

  const table = renderReqs.length ? (
    <RequirementTable
      dataSet={dataSet}
      value={renderReqs}
      onChange={setRequirements}
      findProc={(term) => setProcessTerm(term)}
    />
  ) : (
    <div
      className="alert alert-primary"
      role="alert"
      style={'text-align: right'}
    >
      Add a process to get started <ArrowRightIcon />
    </div>
  );

  rows.push(
    <>
      <div className={'col-xxl-8'}>
        {noProductionWarning}
        {table}
      </div>
      <div className={'col-xxl-4'}>{searchTabs}</div>
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

  if (dot) {
    const svg = props.viz.renderString(dot, {
      engine: 'dot',
      format: 'svg',
    });
    rows.push(<img src={`data:image/svg+xml,${encodeURIComponent(svg)}`} />);
  }

  return (
    <div class={'container-fluid'}>
      {rows.map((row) => (
        <div class={'row'}>{row}</div>
      ))}
    </div>
  );
};
