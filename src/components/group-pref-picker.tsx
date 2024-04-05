import uniq from 'lodash/uniq';

import type { GroupPref } from '../calc';
import type { DataSet } from '../data';
import { Item } from './item';
import { viableFactoriesForGroup } from '../backend/mgmt';
import type { Proc } from './process-table';

export const GroupPrefPicker = (props: {
  dataSet: DataSet;
  processes: Pick<Proc, 'id'>[];
  groupPrefs: GroupPref;
  setGroupPrefs: (groupPref: GroupPref) => void;
}) => {
  const pm = props.dataSet.pm;

  const groups = uniq(
    props.processes.flatMap((proc) => pm.processes[proc.id].factory_group.id),
  ).sort((a, b) => a.localeCompare(b));

  const byGroup = Object.fromEntries(
    groups.map(
      (group) =>
        [
          group,
          viableFactoriesForGroup(pm, group)
            .map(
              (f) =>
                [f.id, f.output_modifier * 1000 + f.duration_modifier] as const,
            )
            .sort(([, a], [, b]) => a - b)
            .map(([id]) => id),
        ] as const,
    ),
  );

  const cols = Object.entries(byGroup).map(([group, factories]) => {
    const trs = factories.map((id) => (
      <tr>
        <td>
          <label>
            <input
              type={'radio'}
              class={'form-check-input'}
              name={`opt-${group}`}
              value={id}
              onChange={() => {
                props.setGroupPrefs({
                  ...props.groupPrefs,
                  [group]: id,
                });
              }}
              checked={props.groupPrefs[group] === id}
            />{' '}
            <Item dataSet={props.dataSet} id={id} />
          </label>
        </td>
        <td class={'text-end'}>
          {(1 / pm.factories[id].duration_modifier).toFixed(2)}
        </td>
      </tr>
    ));

    return (
      <div class={'col'}>
        <h3>{pm.factory_groups[group].name}</h3>
        <table class={'table w-auto'}>
          <thead />
          <tbody>{trs}</tbody>
        </table>
      </div>
    );
  });

  return <>{cols}</>;
};
