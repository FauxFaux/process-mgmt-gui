import { DataSet } from '../data';
import qm from '../../assets/question-mark.png';
import { handleColours } from '../blurb/format';

export type ItemId = string;

export const Item = (props: { dataSet: DataSet; id: ItemId }) => {
  const lab = props.dataSet.lab?.items?.[props.id];
  const name = handleColours(lab?.name || props.id);

  if (lab) {
    return (
      <span class={'item'} title={`${props.id} (${lab.stack ?? '?'})`}>
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
    <span class={'item'}>
      <span className="icon-sprite" style={`background: url("${qm}")`} />
      &nbsp;
      <span class={'item--raw'}>{name}</span>
    </span>
  );
};
