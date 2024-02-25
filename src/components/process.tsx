import type { DataSet } from '../data';
import qm from '../../assets/question-mark.png';
import { handleColours } from '../blurb/format';
import type { ProcessId } from '../app';

export const Process = (props: { dataSet: DataSet; id: ProcessId }) => {
  const lab = props.dataSet.lab?.processes?.[props.id];
  const name = handleColours(lab?.name || props.id);

  if (lab) {
    return (
      <span class={'process'} title={`${props.id}`}>
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
    <span class={'process'}>
      <span className="icon-sprite" style={`background: url("${qm}")`} />
      &nbsp;
      <span class={'process--raw'}>{name}</span>
    </span>
  );
};
