import { JSX } from 'preact';
import { useState } from 'preact/hooks';
import type { Viz } from '@viz-js/viz';

import { DataSet } from './data';
import {
  Line,
  RequirementTable,
  Unknowns,
} from './components/requirement-table';
import { solve } from './backend/mgmt';
import { ItemPicker } from './components/item-picker';
import { ProcessPicker } from './components/process-picker';

import { Modifier, Proc, ProcessTable } from './components/process-table';

export const Calc = (props: { dataSet: DataSet; viz: Viz }) => {
  const [requirements, setRequirements] = useState([] as Line[]);
  const [processes, setProcesses] = useState([] as Proc[]);

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

  for (const [item, req] of Object.entries(unknowns).sort()) {
    renderReqs.push({ item, req: { op: 'auto', amount: 1, hint: req } });
  }

  const defaultMod = (): Modifier => ({
    mode: 'additional',
    amount: 0,
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
  rows.push(
    <>
      <div className={'col-xxl-8'}>
        <RequirementTable
          dataSet={dataSet}
          value={renderReqs}
          onChange={setRequirements}
          findProc={(term) => setProcessTerm(term)}
        />
      </div>
      <div className={'col-xxl-4'}>
        <ul className="nav nav-tabs">
          <li className="nav-item">
            <a
              className={
                'nav-link ' + (searchTab === 'process' ? 'active' : '')
              }
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
      </div>
    </>,
  );

  rows.push(
    <div class={'col'}>
      <ProcessTable
        dataSet={dataSet}
        processes={processes}
        onChange={(procs) => setProcesses(procs)}
      />
    </div>,
  );

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
