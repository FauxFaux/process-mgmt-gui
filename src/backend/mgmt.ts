import { ProcessChain, Process } from 'process-mgmt/src/process.js';
import { LinearAlgebra } from 'process-mgmt/src/visit/linear_algebra_visitor.js';
import { RateVisitor } from 'process-mgmt/src/visit/rate_visitor.js';
import { ProcessCountVisitor } from 'process-mgmt/src/visit/process_count_visitor.js';
import { Factory, Item, Stack } from 'process-mgmt/src/structures.js';

import { DataSet } from '../data';
import { Line } from '../components/requirement-table';
import { ItemId } from '../components/item';
import { Proc } from '../app';

interface SolverInputs {
  requirements: Stack[];
  imports: { id: string }[];
  exports: { id: string }[];
  processes: Process[];
}

export const solve = (data: DataSet, lines: Line[], processes: Proc[]) => {
  const inputs: SolverInputs = {
    requirements: [],
    imports: [],
    exports: [],
    processes: [],
  };

  inputs.processes = processes.map((proc) => data.pm.processes[proc.id]);

  for (const line of lines) {
    switch (line.req.op) {
      case 'auto':
        continue;
      case 'import':
        inputs.imports.push({ id: line.item });
        break;
      case 'export':
        inputs.exports.push({ id: line.item });
        break;
      case 'produce':
        inputs.requirements.push(
          new Stack(data.pm.items[line.item], line.req.amount),
        );
        break;
      default:
        throw new Error(`unknown op: ${line.req.op}`);
    }
  }

  const hasRequirements = new Set(
    inputs.requirements.map((stack) => stack.item.id),
  );

  if (!inputs.processes.length) {
    // TODO: do not understand this at all
    // https://github.com/CandleCandle/process-mgmt-ui/blob/9ea108e1c586d7e11f0423ed26c78fd69884660c/src/index.js#L451
    const bodge: PartialLav = {
      items: [],
      mtx: [],
      augmented_matrix: {
        getRow: (idx) => {
          return { data: [bodge.mtx[idx]] };
        },
      },
    };

    for (const req of inputs.requirements) {
      bodge.items.push(req.item);
      bodge.mtx.push([1]);
    }

    for (const imp of inputs.imports) {
      bodge.items.push(data.pm.items[imp.id]);
      bodge.mtx.push([0]);
    }

    for (const exp of inputs.exports) {
      bodge.items.push(data.pm.items[exp.id]);
      bodge.mtx.push([-1]);
    }

    return computeUnknowns(bodge, (itemId) => hasRequirements.has(itemId));
  }

  return rawSolve(inputs);
};

export const rawSolve = (inputs: SolverInputs) => {
  const lav = new LinearAlgebra(
    inputs.requirements,
    inputs.imports.map((i) => i.id),
    inputs.exports.map((i) => i.id),
  );
  const chain = new ProcessChain(inputs.processes)
    .accept(
      new RateVisitor(
        (proc) => new Factory('unknown', 'unknown', null),
        // getModifiedFactoryForProcess(data, proc),
      ),
    )
    .accept(new ProcessCountVisitor())
    .accept(lav);

  const hasRequirements = new Set(
    inputs.requirements.map((stack) => stack.item.id),
  );

  return computeUnknowns(lav, (itemId) => hasRequirements.has(itemId));
};

interface PartialLav {
  items: Item[];
  mtx: number[][];
  augmented_matrix: {
    getRow: (idx: number) => { data: number[][] };
  };
}

type Recommendation = 'import' | 'export';

const computeUnknowns = (
  chain: PartialLav,
  hasRequirement: (item: ItemId) => boolean,
): Record<ItemId, Recommendation> => {
  const result: Record<string, Recommendation> = {};
  for (let i = 0; i < chain.items.length; i++) {
    const itemId = chain.items[i].id;
    const [row] = chain.augmented_matrix.getRow(i).data;
    const producers = row.filter((x) => x > 0).length;
    const consumers = row.filter((x) => x < 0).length;
    const wanted = hasRequirement(itemId);
    const onlyConsumed = consumers > 0 && producers === 0;
    const notConsumedButProducedAndWanted =
      consumers === 0 && producers === 1 && wanted;
    const producedButNotConsumed = consumers === 0 && producers > 0;
    if (onlyConsumed || notConsumedButProducedAndWanted) {
      result[itemId] = 'import';
    } else if (producedButNotConsumed) {
      result[itemId] = 'export';
    }
  }
  return result;
};
