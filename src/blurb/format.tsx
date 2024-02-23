export const handleColours = (text: string) => {
  const bits = text.split(/(.*?)\[color=(\d+,\d+,\d+)]([^[]+)\[\/color]/g);
  if (bits.length === 1) {
    return <>{text}</>;
  }
  console.log(bits);
  const chunks = 2;
  const parts = [];
  for (let i = 0; i < bits.length; i += chunks) {
    if (i === bits.length - 1) {
      parts.push(<>{bits[i]}</>);
      break;
    }

    const [colour, content] = bits.slice(i, i + chunks);
    if (colour) {
      parts.push(<span style={`color: rgb(${colour})`}>{content}</span>);
    } else {
      parts.push(<>{content}</>);
    }
  }

  return <>{parts}</>;
};
