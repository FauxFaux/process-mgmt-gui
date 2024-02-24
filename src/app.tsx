import { JSX } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import type { BrotliWasmType as Brotli } from 'brotli-wasm';
import type { Viz } from '@viz-js/viz';

import { DataSet, DataSetId, dataSets, loadDataSet } from './data';
import {
  Line,
  RequirementTable,
  Unknowns,
} from './components/requirement-table';
import { solve } from './backend/mgmt';
import { ItemPicker } from './components/item-picker';
import { ProcessPicker } from './components/process-picker';

import { Modifier, Proc, ProcessTable } from './components/process-table';

export type ProcessId = string;

export const App = () => {
  const [libs, setLibs] = useState(
    {} as {
      brotli: Brotli | undefined;
      viz: Viz | undefined;
    },
  );

  useEffect(() => {
    (async () => {
      const bi = await import('brotli-wasm');
      const brotli = await bi.default;
      const vi = await import('@viz-js/viz');
      const viz = await vi.instance();
      setLibs({ brotli, viz });
    })().catch(console.error);
  });

  const [dataSet, setDataSet] = useState<{
    id?: DataSetId;
    data?: DataSet;
  }>({});

  const nav = (
    <nav className="navbar navbar-expand-lg bg-body-tertiary">
      <div className="container-fluid">
        <div className="navbar-brand">process-mgmt</div>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav">
            <li className="nav-item">
              <a
                className="nav-link"
                href="https://github.com/FauxFaux/process-mgmt-gui"
              >
                github
              </a>
            </li>
            <li className="nav-item">
              <a
                className="nav-link"
                href="https://github.com/CandleCandle/process-mgmt"
              >
                engine (GPL-2)
              </a>
            </li>
            <li className="nav-item">
              <span class={'nav-link'}>
                dataset: {dataSet.id ? dataSets[dataSet.id][0] : '[pending]'}
              </span>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );

  const makePicker = () => (
    <p>
      <h3>Select a dataset</h3>
      <div
        className="btn-group-vertical"
        role="group"
        aria-label="Vertical button group"
      >
        {Object.entries(dataSets).map(([rid, [name]]) => (
          <button
            className={'btn btn-primary'}
            onClick={() => {
              const id = rid as DataSetId;
              setDataSet({ id, data: undefined });
              (async () => {
                const data = await loadDataSet(id);
                setDataSet({ id, data });
              })().catch(console.error);
            }}
          >
            {name}
          </button>
        ))}
      </div>
    </p>
  );

  const picker = dataSet.id ? (
    false
  ) : (
    <div className={'container-fluid'}>
      <div className={'row'}>
        <div className={'col'}>{makePicker()}</div>
      </div>
    </div>
  );

  return (
    <>
      {nav}
      {picker}
      {dataSet.id && (!dataSet.data || !libs.viz) && <p>Loading...</p>}
      {dataSet.data && libs.viz && <Calc dataSet={dataSet.data} libs={libs} />}
    </>
  );
};

export const Calc = (props: { dataSet: DataSet; libs: { viz: Viz } }) => {
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
    const svg = props.libs.viz.renderString(dot, {
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
