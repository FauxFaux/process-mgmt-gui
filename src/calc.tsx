import type { JSX } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import type { Viz } from '@viz-js/viz';
import { oneLine as f } from 'common-tags';
import uniq from 'lodash/uniq';

import type { DataSet } from './data';
import type { Hint, Line, Req, Unknowns } from './components/requirement-table';
import { RequirementTable } from './components/requirement-table';
import {
  applyHints,
  computeUnknowns,
  mainSolve,
  makeInputs,
  updateInputsWithHints,
  viableFactoriesForGroup,
} from './backend/mgmt';
import { ProcessPicker } from './components/process-picker';
import type { Proc } from './components/process-table';
import { ProcessTable } from './components/process-table';
import type { Modifier } from './modifiers';

import ArrowRightIcon from 'mdi-preact/ArrowRightIcon';
import PlusBoldIcon from 'mdi-preact/PlusBoldIcon';
import PinIcon from 'mdi-preact/PinIcon';
import ArrowDownIcon from 'mdi-preact/ArrowDownIcon';
import { RateGraphAsDot } from './backend/rate-graph';
import { Item } from './components/item';
import type { Factory } from 'process-mgmt/dist/factory';
import type { Process } from 'process-mgmt/dist/process';

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

  const chain = useMemo(() => {
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
    return mainSolve(inputs).chain;
  }, [processes, props.dataSet, requirements, unknowns]);

  if (chain) {
    rows.push(
      <div class={'col'}>
        <ProcessTable
          dataSet={dataSet}
          processes={processes}
          onChange={(procs) => setProcesses(procs)}
          chain={chain}
        />
      </div>,
    );

    const groups = uniq(
      processes.flatMap(
        (proc) => dataSet.pm.processes[proc.id].factory_group.id,
      ),
    ).sort((a, b) => a.localeCompare(b));

    const byGroup = Object.fromEntries(
      groups.map(
        (group) =>
          [
            group,
            viableFactoriesForGroup(dataSet.pm, group)
              .map(
                (f) =>
                  [
                    f.id,
                    f.output_modifier * 1000 + f.duration_modifier,
                  ] as const,
              )
              .sort(([, a], [, b]) => a - b)
              .map(([id]) => id),
          ] as const,
      ),
    );

    const cols = Object.entries(byGroup).map(([group, factories]) => (
      <div class={'col'}>
        <h3>{dataSet.pm.factory_groups[group].name}</h3>
        <table class={'table w-auto'}>
          <thead />
          <tbody>
            {factories.map((id) => {
              const htmlId = `opt-for-${group}-${id}`;
              return (
                <tr>
                  <td>
                    <label for={htmlId}>
                      <input
                        type={'radio'}
                        class={'form-check-input'}
                        name={`opt-${group}`}
                        id={htmlId}
                        value={id}
                        onChange={() => {
                          setGroupPrefs({
                            ...defaultGroupPref,
                            [group]: id,
                          });
                        }}
                      />{' '}
                      <Item dataSet={props.dataSet} id={id} />
                    </label>
                  </td>
                  <td class={'text-end'}>
                    {(1 / dataSet.pm.factories[id].duration_modifier).toFixed(
                      2,
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    ));

    rows.push(<>{cols}</>);
  }

  if (chain) {
    const dot = chain.accept(new RateGraphAsDot(props.dataSet)).join('\n');
    const svg = props.viz.renderSVGElement(dot, {
      engine: 'dot',
      format: 'svg',
    });

    const fiddled = fiddleSvg(props.dataSet, svg);
    rows.push(<div dangerouslySetInnerHTML={{ __html: fiddled.outerHTML }} />);
  }

  return (
    <div class={'container-fluid'}>
      {rows.map((row) => (
        <div class={'row'}>{row}</div>
      ))}
    </div>
  );
};

const fiddleSvg = (dataSet: DataSet, svg: SVGElement): SVGElement => {
  const bads: [HTMLAnchorElement, string][] = [];
  for (const tag of svg.getElementsByTagName('a')) {
    const href = tag.getAttribute('xlink:href');
    if (href?.startsWith('icon:')) {
      bads.push([tag, href.slice(5)]);
    }
  }
  for (const [el, id] of bads) {
    const border = el.getElementsByTagName('polygon');
    const text = el.getElementsByTagName('text');
    const alignAgainst = text[0];
    const parent = el.parentNode;
    if (!parent) continue;
    parent.prepend(...text);
    parent.prepend(...border);

    const xmlns = 'http://www.w3.org/2000/svg';
    const add = document.createElementNS(xmlns, 'image');
    const lab = dataSet.lab?.items?.[id];
    const sx = parseFloat(alignAgainst.getAttribute('x') ?? '0') - 3;
    const sy = parseFloat(alignAgainst.getAttribute('y') ?? '0') - 12;
    const ts = 4;

    el.remove();
    if (!dataSet.ico || !lab) continue;

    const unIcon = (pos: string) => {
      const [x, y] = pos
        .split(' ')
        .map(parseFloat)
        .map((v) => -1 * v);
      const w = 64;
      // right top left bottom
      return f`clip-path: rect(${y}px ${x + w}px ${y + w}px ${x}px);
       transform: translate(${sx - x / ts}px, ${sy - y / ts}px) scale(${1 / ts})`;
    };

    add.setAttribute('href', dataSet.ico);
    add.setAttribute('style', unIcon(lab?.iconPos ?? '0 0'));
    parent.prepend(add);
  }
  return svg;
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
