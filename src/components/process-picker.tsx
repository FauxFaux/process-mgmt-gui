import type { DataSet } from '../data';
import PlusBoldIcon from 'mdi-preact/PlusBoldIcon';
import { Process } from './process';
import type { ItemId } from './item';
import { Item } from './item';
import { regexpOrNot } from '../blurb/search';
import type { Process as CProcess } from 'process-mgmt/dist/process.js';
import PinIcon from 'mdi-preact/PinIcon';

export type ProcessId = string;

export const ProcessPicker = (props: {
  dataSet: DataSet;
  term: string;
  picked: (process: ProcessId) => void;
  pinItem: (item: ItemId) => void;
  alreadyProc: (process: ProcessId) => boolean;
  alreadyItem: (item: ItemId) => boolean;
  // ReturnType<(typeof useState<number>)(a: number)>
  shown: [number, (next: number) => void];
}) => {
  const [shown, setShown] = props.shown;

  const term = props.term;
  if (!term) return <></>;

  // this code is heavily dependent on insertion order being maintained, which JS guarantees
  const itemMatches: Record<ItemId, ProcessId[]> = {};
  const matches: Record<string, ProcessId[]> = {};

  if (term.startsWith('p:')) {
    const wantId = term.slice(2);
    matches['produced by'] = Object.entries(props.dataSet.pm.processes)
      .filter(([, p]) => p.outputs.some((o) => o.item.id === wantId))
      .map(([id]) => id);
  } else if (term.startsWith('c:')) {
    const wantId = term.slice(2);
    matches['consumed by'] = Object.entries(props.dataSet.pm.processes)
      .filter(([, p]) => p.inputs.some((o) => o.item.id === wantId))
      .map(([id]) => id);
  } else {
    const itemIds = Object.keys(props.dataSet.pm.items).sort();
    const itemNames = itemIds
      .flatMap((id) => {
        const name = props.dataSet.lab?.items?.[id]?.name;
        return name ? [[id, name] as const] : [];
      })
      .sort(
        ([ai, an], [bi, bn]) => an.localeCompare(bn) || ai.localeCompare(bi),
      );

    const sorted = Object.values(props.dataSet.pm.processes).sort(
      ({ id: a, duration: aDur }, { id: b, duration: bDur }) =>
        bDur - aDur || a.localeCompare(b),
    );
    const ids = sorted.map(({ id }) => id);
    const names = sorted.flatMap(({ id }) => {
      const name = props.dataSet.lab?.processes?.[id]?.name;
      return name ? [[id, name] as const] : [];
    });

    const filterItemNames = (test: (s: string) => boolean) =>
      itemNames.filter(([, name]) => test(name)).map(([id]) => id);

    const filterNames = (test: (s: string) => boolean) =>
      names.filter(([, name]) => test(name)).map(([id]) => id);

    const refix = regexpOrNot(`^${term}`);
    const re = regexpOrNot(term);

    itemMatches['human prefix'] = filterItemNames((name) => refix.test(name));
    itemMatches['id prefix'] = itemIds.filter((id) => refix.test(id));
    itemMatches['human full'] = filterItemNames((name) => re.test(name));
    itemMatches['id full'] = itemIds.filter((id) => re.test(id));

    matches['human prefix'] = filterNames((name) => refix.test(name));
    // matches['id prefix'] = ids.filter((id) => refix.test(id));
    matches['human full'] = filterNames((name) => re.test(name));
    matches['id full'] = ids.filter((id) => re.test(id));
  }

  const displayItems: Record<
    string,
    [number, Record<ItemId, [number, ProcessId[]]>]
  > = {};
  const display: Record<string, [number, ProcessId[]]> = {};
  const alreadyItems = new Set<ItemId>();
  const already = new Set<ProcessId>();
  for (const [key, ids] of Object.entries(itemMatches)) {
    const filtered = ids.filter((id) => !alreadyItems.has(id));
    if (filtered.length === 0) {
      continue;
    }
    const showingItems = filtered.slice(0, shown);
    showingItems.forEach((id) => alreadyItems.add(id));
    const recps: Record<ItemId, [number, ProcessId[]]> = {};
    for (const id of showingItems) {
      const processes = Object.entries(props.dataSet.pm.processes)
        .filter(([, p]) => p.outputs.some((o) => o.item.id === id))
        .map(([id]) => id);
      const filtered = processes
        .filter((id) => !already.has(id))
        .filter((id) => props.dataSet.lab?.processes?.[id]?.contained !== true);
      const showing = filtered.slice(0, shown);
      recps[id] = [filtered.length, showing];
      processes.forEach((id) => already.add(id));
    }
    displayItems[key] = [filtered.length, recps];
  }

  for (const [key, ids] of Object.entries(matches)) {
    const filtered = ids.filter((id) => !already.has(id));
    if (filtered.length === 0) {
      continue;
    }
    const showing = filtered.slice(0, shown);
    display[key] = [filtered.length, showing];
    showing.forEach((id) => already.add(id));
  }

  const ProcWithButton = (mp: { obj: CProcess }) => (
    <>
      <button
        class={'btn btn-sm btn-outline-secondary'}
        onClick={(e) => {
          e.preventDefault();
          props.picked(mp.obj.id);
        }}
        disabled={props.alreadyProc(mp.obj.id)}
        title={
          props.alreadyProc(mp.obj.id)
            ? 'already present'
            : 'include process and generate item requirements'
        }
      >
        <PlusBoldIcon />
      </button>
      <Process dataSet={props.dataSet} id={mp.obj.id} />{' '}
      {!!mp.obj.inputs.length && (
        <>
          <i>from</i>{' '}
          {mp.obj.inputs.map(({ item }) => (
            <Item dataSet={props.dataSet} id={item.id} justIcon={true} />
          ))}
        </>
      )}
    </>
  );

  const More = (props: { actShown: [number, number] }) => {
    const [act, shown] = props.actShown;
    if (act === shown) return <></>;
    return (
      <li>
        ... and{' '}
        <a
          href={'#'}
          onClick={(e) => {
            e.preventDefault();
            setShown(shown * 2);
          }}
        >
          {act - shown} more
        </a>
        .
      </li>
    );
  };

  const itemLines = Object.entries(displayItems).flatMap(
    ([head, [catTotal, items]]) => {
      const itemGroups = Object.entries(items).flatMap(
        ([itemId, [procTotal, processes]]) => {
          const regular = processes.map((process) => (
            <li class={'process__recp--with-header'}>
              <ProcWithButton obj={props.dataSet.pm.processes[process]} />
            </li>
          ));
          return [
            <li>
              <button
                class={'btn btn-sm btn-outline-secondary'}
                onClick={() => props.pinItem(itemId)}
                disabled={props.alreadyItem(itemId)}
                title={
                  props.alreadyItem(itemId)
                    ? 'already present'
                    : 'force item to be included in requirements, despite not having any associated processes'
                }
              >
                <PinIcon />
              </button>
              <Item dataSet={props.dataSet} id={itemId} />{' '}
              <i>(item) {procTotal ? 'made by:' : ''}</i>
              <ul>
                {regular}
                <More actShown={[procTotal, processes.length]} />
              </ul>
            </li>,
          ];
        },
      );

      const catAvail = Object.keys(items).length;
      return [
        <hr title={`item ${head} (${catAvail}/${catTotal})`} />,
        ...itemGroups,
        <More actShown={[catTotal, catAvail]} />,
      ];
    },
  );

  const lines = Object.entries(display).flatMap(
    ([head, [total, processes]]) => {
      const regular = processes.map((process) => (
        <li>
          <ProcWithButton obj={props.dataSet.pm.processes[process]} />
        </li>
      ));
      return [
        <hr title={`${head} (${processes.length}/${total})`} />,
        ...regular,
        <More actShown={[total, processes.length]} />,
      ];
    },
  );

  return (
    <ul class={'process__list'}>
      {itemLines}
      {lines}
    </ul>
  );
};
