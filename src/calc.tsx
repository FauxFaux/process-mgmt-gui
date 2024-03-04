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

  const yellow = props.dataSet.lab!.items['transport-belt'].iconPos;
  const red = props.dataSet.lab!.items['express-transport-belt'].iconPos;

  const unIcon = (pos: string) => {
    const [x, y] = pos
      .split(' ')
      .map(parseFloat)
      .map((v) => -1 * v);
    const w = 64;
    return `clip-path: rect(${y}px ${x + w}px ${y + w}px ${x}px); transform: translate(-${x}px, -${y}px)`;
  };

  const rows: JSX.Element[] = [
    <svg width={'64'} height={'64'}>
      <image href={props.dataSet.ico} style={unIcon(yellow)} />
    </svg>,
  ];

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
    const svg = props.viz.renderSVGElement(dot, {
      engine: 'dot',
      format: 'svg',
      images: [{ name: 'icon.hack', width: '64px', height: '64px' }],
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
    const borrow = text[0];
    el.parentNode?.prepend(...text);
    el.parentNode?.prepend(...border);

    console.log(borrow);
    const xmlns = 'http://www.w3.org/2000/svg';
    const add = document.createElementNS(xmlns, 'image');
    const lab = dataSet.lab?.items?.[id];
    add.setAttribute('x', borrow.getAttribute('x')!);
    add.setAttribute('y', parseFloat(borrow.getAttribute('y')!) - 12);
    add.setAttribute('width', '64');
    add.setAttribute('height', '64');

    const unIcon = (pos: string) => {
      const [x, y] = pos
        .split(' ')
        .map(parseFloat)
        .map((v) => -1 * v);
      const w = 64;
      return `clip-path: rect(${y}px ${x + w}px ${y + w}px ${x}px); transform: translate(-${x}px, -${y}px)`;
    };
    const yellow = dataSet.lab!.items['transport-belt'].iconPos;
    const dat = `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'>
      <image width='1516' height='1450' href='${dataSet.ico}' style='${unIcon(yellow)}' />
    </svg>`;

    add.setAttribute('href', `data:image/svg+xml;utf8, ${dat}`);

    // add.setAttribute('style', unIcon(lab?.iconPos ?? '0 0'));
    // add.setAttribute('href', dataSet.ico);
    el.parentNode?.prepend(add);
    el.remove();
  }
  return svg;
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
