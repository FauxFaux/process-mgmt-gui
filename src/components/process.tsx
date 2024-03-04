import type { DataSet } from '../data';
import qm from '../../assets/question-mark.png';
import { handleColours } from '../blurb/format';
import type { ProcessId } from '../app';

export const processName = (dataSet: DataSet, id: ProcessId) => {
  const lab = dataSet.lab?.processes?.[id];
  return lab?.name || id;
};

export const Process = (props: { dataSet: DataSet; id: ProcessId }) => {
  const lab = props.dataSet.lab?.processes?.[props.id];
  const name = handleColours(processName(props.dataSet, props.id));

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
