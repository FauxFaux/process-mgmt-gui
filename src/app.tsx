import type { StateUpdater } from 'preact/hooks';
import { useEffect, useState } from 'preact/hooks';
import type { BrotliWasmType as Brotli } from 'brotli-wasm';
import type { Viz } from '@viz-js/viz';

import type { DataSet, DataSetId } from './data';
import { dataSets, loadDataSet } from './data';
import type { CalcState } from './calc';
import { Calc } from './calc';
import type { ItemId } from './components/item';
import type { ModifierStyle } from './modifiers';
import { unB64 } from './blurb/base64';
import type { Line } from './components/requirement-table';

export type ProcessId = string;

interface DataSetState {
  id?: DataSetId;
  data?: DataSet;
}

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

  useEffect(() => {
    hashChange();
  }, []);

  const setDataSetId = (id: DataSetId) => {
    setDataSet({ id, data: undefined });
    (async () => {
      try {
        const data = await loadDataSet(id);
        setDataSet({ id, data });
      } catch (e) {
        console.error('Failed to load dataset', id, e);
        // TODO: UX
      }
    })();
  };

  const hashChange = () => {
    const hash = window.location.hash;
    handleB64({ setDataSetId, setCalc }, hash.slice(1));
  };

  useEffect(() => {
    window.addEventListener('hashchange', hashChange);
    return () => window.removeEventListener('hashchange', hashChange);
  }, []);

  const [dataSet, setDataSet] = useState<DataSetState>({});

  const [calc, setCalc] = useState<CalcState>(defaultCalc());

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
            <li className="nav-item">
              <span class={'nav-link'}>
                <button
                  className={'btn btn-outline-danger btn-sm nav__clear-all'}
                  onClick={() => {
                    setDataSet({});
                    setCalc(defaultCalc());
                  }}
                >
                  clear everything
                </button>
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
              setDataSetId(id);
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
      {dataSet.data && libs && (
        <Calc
          dataSet={dataSet.data}
          viz={libs.viz}
          state={calc}
          setState={setCalc}
        />
      )}
    </>
  );
};

type Setters = {
  setDataSetId: (id: DataSetId) => void;
  setCalc: StateUpdater<CalcState>;
};

const handleB64 = (setters: Setters, b64: string) => {
  const bytes = unB64(b64);
  if (bytes.length < 4) {
    throw new Error('input too short');
  }
  if (bytes[0] === '{'.charCodeAt(0)) {
    const obj: any = JSON.parse(new TextDecoder().decode(bytes));
    switch (obj.v) {
      case 1:
        handleV1(setters, obj as unknown as CandleV1);
        break;
      default:
        throw new Error(`unknown json version: ${obj.v}`);
    }
  } else {
    throw new Error('unknown format');
  }
};

type CandleModifierStyle = 'r' | 'p' | 'a';
const modifierStyles: Record<CandleModifierStyle, ModifierStyle> = {
  r: 'raw',
  p: 'normal',
  a: 'additional',
};

interface CandleV1 {
  v: 1;
  game_id: DataSetId | unknown;

  imports: ItemId[];
  exports: ItemId[];
  requirements: { id: ItemId; q: number }[];

  processes: ProcessId[];
  process_modifiers: Record<
    ProcessId,
    {
      ds: CandleModifierStyle;
      d: number;
      os: CandleModifierStyle;
      o: number;
    }
  >;
  // "crafting-with-fluid": "assembling-machine-3"
  default_factory_groups: Record<string, string>;

  // probably complete?
}

const handleV1 = (setters: Setters, obj: CandleV1) => {
  // obj is not validated; assuming it's correct
  setters.setDataSetId(obj.game_id as DataSetId);
  const calc: CalcState = {
    requirements: obj.requirements
      .map(
        ({ id, q }): Line => ({
          item: id,
          req: { op: 'produce', amount: q },
        }),
      )
      .concat(
        obj.imports.map(
          (id): Line => ({ item: id, req: { op: 'import', amount: 0 } }),
        ),
      )
      .concat(
        obj.exports.map(
          (id): Line => ({ item: id, req: { op: 'export', amount: 0 } }),
        ),
      ),
    processes: obj.processes.map((id) => {
      const mod = obj.process_modifiers[id];
      return {
        id,
        durationModifier: { mode: modifierStyles[mod.ds], amount: 1 / mod.d },
        outputModifier: { mode: modifierStyles[mod.os], amount: mod.o },
      };
    }),
  };
  setters.setCalc(calc);
};

const defaultCalc = (): CalcState => ({
  requirements: [],
  processes: [],
});

// guess of a workaround for some apparently memory leaks from initing locally
const brotliPromise = import('brotli-wasm')
  .then(async (bi) => bi.default)
  .then((brotli) => ({ brotli }))
  .catch((err: unknown) => ({ err }));

const vizPromise = import('@viz-js/viz')
  .then(async (vi) => vi.instance())
  .then((viz) => ({ viz }))
  .catch((err: unknown) => ({ err }));
