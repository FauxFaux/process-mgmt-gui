import type { Process } from 'process-mgmt/src/process.js';
/* jest is boned, please run `npm t` */
import { ProcessChain } from 'process-mgmt/src/process.js';
/* jest is boned, please run `npm t` */
import { LinearAlgebra } from 'process-mgmt/src/visit/linear_algebra_visitor.js';
import { RateVisitor } from 'process-mgmt/src/visit/rate_visitor.js';
import { ProcessCountVisitor } from 'process-mgmt/src/visit/process_count_visitor.js';
import type { Data, Item } from 'process-mgmt/src/structures.js';
import { Factory, Stack } from 'process-mgmt/src/structures.js';

import type { DataSet } from '../data';
import type { Line, Unknowns } from '../components/requirement-table';
import type { ItemId } from '../components/item';
import type { Proc } from '../components/process-table';
import type { ProcessId } from '../app';

/** not for export, but passed ("opaquely") to others */
interface SolverInputs {
  requirements: Stack[];
  imports: string[];
  exports: string[];
  processes: Process[];
  factoryForProcess: Record<ProcessId, Factory>;
}

export const makeInputs = (
  data: DataSet,
  requirements: Line[],
  processes: Proc[],
): SolverInputs => {
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

  for (const line of requirements) {
    switch (line.req.op) {
      case 'auto':
        continue;
      case 'import':
        inputs.imports.push(line.item);
        break;
      case 'export':
        inputs.exports.push(line.item);
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

  return inputs;
};

export const updateInputsWithHints = (
  inputs: SolverInputs,
  requirements: Line[],
  unknowns: Unknowns,
) => {
  for (const line of requirements.filter((line) => line.req.op === 'auto')) {
    const hint = unknowns[line.item];
    switch (hint) {
      case 'import':
        inputs.imports.push(line.item);
        break;
      case 'export':
        inputs.exports.push(line.item);
        break;
      case undefined:
        // maybe unreachable with ?? unknowns but who knows
        break;
      default:
        throw new Error(`unknown hint: ${hint}`);
    }
  }
};

export const mainSolve = (
  inputs: SolverInputs,
): { chain: ProcessChain; lav: PartialLav } => {
  const lav = new LinearAlgebra(
    inputs.requirements,
    inputs.imports,
    inputs.exports,
  );
  const chain = new ProcessChain(inputs.processes)
    .accept(new RateVisitor((proc) => inputs.factoryForProcess[proc.id]))
    .accept(new ProcessCountVisitor())
    .accept(lav);
  return { chain, lav };
};

interface PartialLav {
  items: Item[];
  mtx: number[][];
  augmented_matrix: {
    getRow: (idx: number) => { data: number[][] };
  };
}

export const computeUnknowns = (inputs: SolverInputs): Unknowns => {
  const hasRequirements = new Set(
    inputs.requirements.map((stack) => stack.item.id),
  );
  const hasRequirement = (itemId: ItemId) => hasRequirements.has(itemId);
  const { lav: chain } = mainSolve(inputs);

  const result: Unknowns = {};
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

export const applyHints = (requirements: Line[], unknowns: Unknowns) => {
  const ret: Line[] = [];

  for (const line of requirements) {
    if (line.req.op === 'auto' && !unknowns[line.item]) {
      continue;
    }
    ret.push(line);
    delete unknowns[line.item];
  }

  const noExistingReqs = ret.length === 0;

  // place 'export's (recipe outputs) before imports where possible
  for (const req of ['export', 'import'] as const) {
    for (const [item] of Object.entries(unknowns)
      .filter(([, unk]) => unk === req)
      .sort()) {
      const op = req === 'export' && noExistingReqs ? 'produce' : 'auto';
      ret.push({ item, req: { op, amount: 1 } });
    }
  }

  return ret;
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
