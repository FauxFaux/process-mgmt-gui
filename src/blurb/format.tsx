export const handleColours = (text: string) => {
  const bits = text.split(/(.*?)\[color=(\d+,\d+,\d+)]([^[]+)\[\/color]/g);
  if (bits.length === 1) {
    return <>{text}</>;
  }
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

export const stripColours = (text: string) => {
  return text.replace(/\[color=(\d+,\d+,\d+)]([^[]+)\[\/color]/g, '$2');
};

export const roundTo = (value: number, places: number) => {
  const factor = Math.pow(10, places);
  return Math.round(value * factor) / factor;
};

export const twoDp = (n: number) => Math.round(n * 100) / 100;

export const unTitleCase = (s: string) => s[0].toLowerCase() + s.slice(1);
