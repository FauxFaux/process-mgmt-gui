import type { DataSet } from '../data';
import qm from '../../assets/question-mark.png';
import { handleColours, stripColours } from '../blurb/format';

export type ItemId = string;

export const itemName = (dataSet: DataSet, id: ItemId) => {
  const lab = dataSet.lab?.items?.[id];
  return lab?.name || id;
};

export const Item = (props: {
  dataSet: DataSet;
  id: ItemId;
  justIcon?: true;
}) => {
  const rawName = itemName(props.dataSet, props.id);
  const lab = props.dataSet.lab?.items?.[props.id];
  const name = props.justIcon ? <></> : handleColours(rawName);
  const title = props.justIcon
    ? `${stripColours(rawName)}`
    : `${props.id} (${(lab && lab.stack) ?? '?'})`;

  if (lab) {
    return (
      <span class={'item'} title={title}>
        <span
          className={'icon-sprite ' + (lab.contained ? 'icon--contained' : '')}
          style={`background: url("${props.dataSet.ico}") ${lab.iconPos}`}
        />
        &nbsp;
        {name}
      </span>
    );
  }

  return (
    <span class={'item'} title={title}>
      <span className="icon-sprite" style={`background: url("${qm}")`} />
      &nbsp;
      <span class={'item--raw'}>{name}</span>
    </span>
  );
};
