import { useEffect, useState } from 'preact/hooks';
import type { BrotliWasmType as Brotli } from 'brotli-wasm';
import type { Viz } from '@viz-js/viz';

import { DataSet, DataSetId, dataSets, loadDataSet } from './data';
import { Calc } from './calc';

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
      {dataSet.data && libs.viz && (
        <Calc dataSet={dataSet.data} viz={libs.viz} />
      )}
    </>
  );
};
