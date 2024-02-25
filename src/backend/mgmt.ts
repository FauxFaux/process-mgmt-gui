import { ProcessChain, Process } from 'process-mgmt/src/process.js';
import { LinearAlgebra } from 'process-mgmt/src/visit/linear_algebra_visitor.js';
import { RateVisitor } from 'process-mgmt/src/visit/rate_visitor.js';
import { ProcessCountVisitor } from 'process-mgmt/src/visit/process_count_visitor.js';
import { RateGraphRenderer } from 'process-mgmt/src/visit/rate_graph_renderer.js';
import { Data, Factory, Item, Stack } from 'process-mgmt/src/structures.js';

import { DataSet } from '../data';
import { Line, Unknowns } from '../components/requirement-table';
import { ItemId } from '../components/item';
import { Proc } from '../components/process-table';
import { ProcessId } from '../app';

interface SolverInputs {
  requirements: Stack[];
  imports: { id: string }[];
  exports: { id: string }[];
  processes: Process[];
  factoryForProcess: Record<ProcessId, Factory>;
}

export const solve = (
  data: DataSet,
  lines: Line[],
  processes: Proc[],
): {
  unknowns: Unknowns;
  dot?: string;
} => {
  const inputs: SolverInputs = {
    requirements: [],
    imports: [],
    exports: [],
    processes: [],
    factoryForProcess: {},
  };

  inputs.processes = processes.map((proc) => data.pm.processes[proc.id]);

  inputs.factoryForProcess = Object.fromEntries(
    processes.map((proc) => {
      const pm = data.pm.processes[proc.id];
      const factories = viableFactoriesForGroup(
        data.pm,
        pm.factory_group.id,
      ).map(
        (orig) =>
          new Factory(
            orig.id,
            orig.name,
            orig.groups,
            orig.duration_modifier / proc.durationModifier.amount,
            orig.output_modifier * proc.outputModifier.amount,
          ),
      );

      return [proc.id, selectFastestFactory(factories)];
    }),
  );

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

  return rawSolve(inputs);
};

export const rawSolve = (inputs: SolverInputs) => {
  const lav = new LinearAlgebra(
    inputs.requirements,
    inputs.imports.map((i) => i.id),
    inputs.exports.map((i) => i.id),
  );
  const chain = new ProcessChain(inputs.processes)
    .accept(new RateVisitor((proc) => inputs.factoryForProcess[proc.id]))
    .accept(new ProcessCountVisitor())
    .accept(lav);

  const hasRequirements = new Set(
    inputs.requirements.map((stack) => stack.item.id),
  );

  const dot = chain.accept(new RateGraphRenderer()).join('\n');

  return {
    unknowns: computeUnknowns(lav, (itemId) => hasRequirements.has(itemId)),
    dot,
  };
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

const viableFactoriesForGroup = (data: Data, groupId: string): Factory[] =>
  Object.values(data.factories).filter((factory) =>
    (factory.groups ?? []).some((fg) => fg.id === groupId),
  );

const selectFastestFactory = (factories: Factory[]): Factory => {
  if (factories.length === 0) {
    throw new Error('no factories');
  }

  return factories.sort((a, b) => a.duration_modifier - b.duration_modifier)[0];
};
