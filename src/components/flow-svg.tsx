import type { DataSet } from '../data';
import { RateGraphAsDot } from '../backend/rate-graph';
import { type ProcessChain } from 'process-mgmt/src/process';
import type { Viz } from '@viz-js/viz';
import { oneLine as f } from 'common-tags';

export const FlowSvg = (props: {
  dataSet: DataSet;
  chain: ProcessChain;
  viz: Viz;
}) => {
  const dot = props.chain.accept(new RateGraphAsDot(props.dataSet)).join('\n');
  const svg = props.viz.renderSVGElement(dot, {
    engine: 'dot',
    format: 'svg',
  });

  const fiddled = fiddleSvg(props.dataSet, svg);
  return <div dangerouslySetInnerHTML={{ __html: fiddled.outerHTML }} />;
};

const fiddleSvg = (dataSet: DataSet, svg: SVGElement): SVGElement => {
  const bads: [HTMLAnchorElement, string][] = [];
  for (const tag of svg.getElementsByTagName('a')) {
    const href = tag.getAttribute('xlink:href');
    if (href?.startsWith('icon:')) {
      bads.push([tag, href.slice(5)]);
    }
  }
  for (const [el, id] of bads) {
    const border = el.getElementsByTagName('polygon');
    const text = el.getElementsByTagName('text');
    const alignAgainst = text[0];
    const parent = el.parentNode;
    if (!parent) continue;
    parent.prepend(...text);
    parent.prepend(...border);

    const xmlns = 'http://www.w3.org/2000/svg';
    const add = document.createElementNS(xmlns, 'image');
    const lab = dataSet.lab?.items?.[id];
    const sx = parseFloat(alignAgainst.getAttribute('x') ?? '0') - 3;
    const sy = parseFloat(alignAgainst.getAttribute('y') ?? '0') - 12;
    const ts = 4;

    el.remove();
    if (!dataSet.ico || !lab) continue;

    const unIcon = (pos: string) => {
      const [x, y] = pos
        .split(' ')
        .map(parseFloat)
        .map((v) => -1 * v);
      const w = 64;
      // right top left bottom
      return f`clip-path: rect(${y}px ${x + w}px ${y + w}px ${x}px);
       transform: translate(${sx - x / ts}px, ${sy - y / ts}px) scale(${1 / ts})`;
    };

    add.setAttribute('href', dataSet.ico);
    add.setAttribute('style', unIcon(lab?.iconPos ?? '0 0'));
    parent.prepend(add);
  }
  return svg;
};
