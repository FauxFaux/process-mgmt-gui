import { useEffect, useState } from 'preact/hooks';
import type { BrotliWasmType as Brotli } from 'brotli-wasm';
import type { Viz } from '@viz-js/viz';

import { DataSet, DataSetId, dataSets, loadDataSet } from './data';
import { Calc } from './calc';

export type ProcessId = string;

export const App = () => {
  const [libs, setLibs] = useState<
    | {
        brotli: Brotli;
        viz: Viz;
      }
    | undefined
  >(undefined);

  useEffect(() => {
    (async () => {
      const brotliLoad = await brotliPromise;
      const vizLoad = await vizPromise;
      if ('err' in brotliLoad || 'err' in vizLoad) {
        console.error('Failed to load libraries', brotliLoad, vizLoad);
        return;
      }
      setLibs({ brotli: brotliLoad.brotli, viz: vizLoad.viz });
    })();
  }, []);

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
    <></>
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
      {dataSet.id && (!dataSet.data || !libs) && <p>Loading...</p>}
      {dataSet.data && libs && <Calc dataSet={dataSet.data} viz={libs.viz} />}
    </>
  );
};

// guess of a workaround for some apparently memory leaks from initing locally
const brotliPromise = import('brotli-wasm')
  .then((bi) => bi.default)
  .then((brotli) => ({ brotli }))
  .catch((err: unknown) => ({ err }));

const vizPromise = import('@viz-js/viz')
  .then((vi) => vi.instance())
  .then((viz) => ({ viz }))
  .catch((err: unknown) => ({ err }));
