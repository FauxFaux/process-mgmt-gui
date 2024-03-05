import type { VisitorOptions } from 'process-mgmt/dist/visit/process_chain_visitor.js';
import { ProcessChainVisitor } from 'process-mgmt/dist/visit/process_chain_visitor.js';
import type { ProcessChain } from 'process-mgmt/dist/process.js';
import type { Item, Stack } from 'process-mgmt/dist/structures.js';
import type { Process } from 'process-mgmt/dist/process.js';
import type { DataSet } from '../data';

import { stripColours, twoDp, unTitleCase } from '../blurb/format';
import { itemName } from '../components/item';
import { processName } from '../components/process';

const colours = {
  red: '#842029', // --bs-danger-border-subtle
  green: '#0f5132', // --bs-success-border-subtle
  objBack: '#343a40', // --bs-grey-dark
  bg: '#212529',
  line: '#dee2e6', // --bs-body-color
  text: 'white',
};

// inspired by https://github.com/CandleCandle/process-mgmt/blob/867f3d9f83c1a3a34edecaebf10e14c6f0fe5721/src/visit/rate_graph_renderer.js (gpl-2)
export class RateGraphAsDot extends ProcessChainVisitor<string[]> {
  readonly dataSet: DataSet;
  readonly out: string[];

  constructor(dataSet: DataSet) {
    super();
    this.out = [
      'digraph {',
      `bgcolor="${colours.bg}";`,
      `edge [ color="${colours.line}"; fontcolor="${colours.text}"; ];`,
      `node [ color="${colours.line}"; fontcolor="${colours.text}"; ];`,
    ];
    this.dataSet = dataSet;
  }

  check(chain: ProcessChain): VisitorOptions {
    if (!chain.process_counts || !chain.materials) {
      throw new Error(
        '`process_counts` and `materials` required (provided by `RateCalculator`)',
      );
    }
    if (!chain.processes[0].factory_type) {
      throw new Error('`factory_type` required (provided by `RateVisitor`)');
    }

    return {
      visit_item: true,
      visit_process: true,
      visit_item_process_edge: true,
      visit_process_item_edge: true,
    };
  }

  visit_item(item: Item, chain: ProcessChain) {
    const produce = twoDp(chain.materials!.total_positive(item).quantity);
    const consume = twoDp(
      chain.materials!.total_negative(item).mul(-1).quantity,
    );
    // language=HTML
    this.out.push(
      `  ${idI(item)} [shape="plaintext" label=<` +
        `<table bgcolor="${itemNodeColour(produce, consume)}" border="0" cellborder="1" cellspacing="0" cellpadding="4">` +
        `<tr><td colspan="2" href="icon:${item.id}">      ${this.itemName(item)}</td></tr>` +
        `<tr><td>produce: ${produce}/s</td><td>consume: ${consume}/s</td></tr>` +
        `</table>>]`,
    );
  }

  itemName = (item: Item) =>
    unTitleCase(stripColours(itemName(this.dataSet, item.id)));

  processName = (process: Process) =>
    unTitleCase(stripColours(processName(this.dataSet, process.id)));

  visit_process(process: Process, chain: ProcessChain) {
    const count = chain.process_counts![process.id];
    const io = (io: 'i' | 'o', index: number, item: Item, quantity: number) =>
      `<${io}${index}> ${this.itemName(item)} (${twoDp(quantity * count)})`;

    const inputs = process.inputs
      .map((stack, index) => io('i', index, stack.item, stack.quantity))
      .join(' | ');
    const outputs = process.outputs
      .map((stack, index) => io('o', index, stack.item, stack.quantity))
      .join(' | ');

    const pft = process.factory_type;
    if (!pft) {
      throw new Error('`factory_type` required (provided by `RateVisitor`)');
    }

    this.out.push(
      `  ${idP(process)} [shape="record" label="{ {${inputs}} | ` +
        `process: ${this.processName(process)} | ` +
        `{ ${this.itemName(pft)} (${process.factory_group.name}) | speed: ${twoDp(1 / pft.duration_modifier)}x | output: ${twoDp(pft.output_modifier)}x } | ` +
        `{ ${twoDp(process.duration)}s/run | ` +
        `${twoDp(count)} factories } | ` +
        `{${outputs}} }"]`,
    );
  }

  visit_item_process_edge(
    stack: Stack,
    process: Process,
    chain: ProcessChain,
    idx: number,
  ) {
    const process_count = chain.process_counts![process.id];
    const input_rate = process.inputs.find((i) => i.item.id === stack.item.id);
    const rate = twoDp((input_rate?.quantity ?? 0) * process_count);
    this.out.push(
      `  ${idS(stack)} -> ${idP(process)}:i${idx} [label="${rate}/s"]`,
    );
  }

  visit_process_item_edge(
    process: Process,
    stack: Stack,
    chain: ProcessChain,
    index: number,
  ) {
    this.out.push(`  ${idP(process)}:o${index} -> ${idS(stack)}`);
  }

  build() {
    this.out.push('}');
    return this.out;
  }
}

const idP = (process: Pick<Process, 'id'>): string =>
  'process_' + process.id.replace(/[^_a-zA-Z0-9]/g, '_');

const idI = (item: Pick<Item, 'id'>): string =>
  'item_' + item.id.replace(/[^a-zA-Z0-9]/g, '_');

const idS = (stack: Stack): string => idI(stack.item);

const itemNodeColour = (produce: number, consume: number) => {
  if (produce > consume) return colours.red;
  if (consume > produce) return colours.green;
  return colours.objBack;
};
