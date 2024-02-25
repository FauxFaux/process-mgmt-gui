import type { DataSet } from '../data';
import PlusBoldIcon from 'mdi-preact/PlusBoldIcon';
import { Process } from './process';
import { Item } from './item';
import { regexpOrNot } from '../blurb/search';

export type ProcessId = string;

export const ProcessPicker = (props: {
  dataSet: DataSet;
  term: string;
  picked: (item: ProcessId) => void;
}) => {
  const term = props.term;
  if (!term) return <></>;

  // this code is heavily dependent on insertion order being maintained, which JS guarantees
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
    const sorted = Object.values(props.dataSet.pm.processes).sort(
      ({ id: a, duration: aDur }, { id: b, duration: bDur }) =>
        bDur - aDur || a.localeCompare(b),
    );
    const ids = sorted.map(({ id }) => id);
    const names = sorted.flatMap(({ id }) => {
      const name = props.dataSet.lab?.processes?.[id]?.name;
      return name ? [[id, name] as const] : [];
    });

    console.log(names);

    const filterNames = (test: (s: string) => boolean) =>
      names.filter(([, name]) => test(name)).map(([id]) => id);

    const refix = regexpOrNot(`^${term}`);
    const re = regexpOrNot(term);
    matches['human prefix'] = filterNames((name) => refix.test(name));
    // matches['id prefix'] = ids.filter((id) => refix.test(id));
    matches['human full'] = filterNames((name) => re.test(name));
    matches['id full'] = ids.filter((id) => re.test(id));
  }

  const show = 6;

  const display: Record<string, [number, ProcessId[]]> = {};
  const already = new Set<ProcessId>();
  for (const [key, ids] of Object.entries(matches)) {
    const filtered = ids.filter((id) => !already.has(id));
    if (filtered.length === 0) {
      continue;
    }
    const showing = filtered.slice(0, show);
    display[key] = [filtered.length, showing];
    showing.forEach((id) => already.add(id));
  }

  const lines = Object.entries(display).flatMap(
    ([head, [total, processes]]) => {
      const regular = processes.map((process) => {
        const obj = props.dataSet.pm.processes[process];
        return (
          <li>
            <button
              class={'btn btn-sm btn-outline-secondary'}
              onClick={(e) => {
                e.preventDefault();
                props.picked(process);
              }}
            >
              <PlusBoldIcon />
            </button>
            <Process dataSet={props.dataSet} id={process} />{' '}
            {!!obj.inputs.length && (
              <>
                <i>from</i>{' '}
                {obj.inputs.map(({ item }) => (
                  <Item dataSet={props.dataSet} id={item.id} justIcon={true} />
                ))}
              </>
            )}
          </li>
        );
      });
      return [
        <hr title={`${head} (${processes.length}/${total})`} />,
        ...regular,
        processes.length !== total && (
          <li>... and {total - processes.length} more</li>
        ),
      ];
    },
  );

  return <ul class={'process__list'}>{lines}</ul>;
};
