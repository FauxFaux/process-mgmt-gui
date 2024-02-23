import { DataSet } from '../data';

export const Item = (props: { dataSet: DataSet; id: string }) => {
  const lab = props.dataSet.lab?.items?.[props.id];
  const name = lab?.name || props.id;
  if (lab) {
    return (
      <span class={'item--regular'}>
        <span
          className="icon-sprite"
          style={`background: url("${props.dataSet.ico}") ${lab.iconPos}`}
        />
        {name}
      </span>
    );
  }

  return <span class={'item--raw'}>{name}</span>;
};
