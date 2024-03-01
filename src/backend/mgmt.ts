import type { Process } from 'process-mgmt/src/process.js';
import { ProcessChain } from 'process-mgmt/src/process.js';
import { LinearAlgebra } from 'process-mgmt/src/visit/linear_algebra_visitor.js';
import { RateVisitor } from 'process-mgmt/src/visit/rate_visitor.js';
import { ProcessCountVisitor } from 'process-mgmt/src/visit/process_count_visitor.js';
import { RateGraphRenderer } from 'process-mgmt/src/visit/rate_graph_renderer.js';
import type { Data, Item } from 'process-mgmt/src/structures.js';
import { Factory, Stack } from 'process-mgmt/src/structures.js';

import { oneLine as f } from 'common-tags';

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
    switch (line.req.hint ?? unknowns[line.item]) {
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
        throw new Error(`unknown hint: ${line.req.hint}`);
    }
  }
};

export const dotFor = (inputs: SolverInputs) => {
  const { chain } = mainSolve(inputs);
  return fiddleDot(chain.accept(new RateGraphRenderer()));
};

export const solve = (
  data: DataSet,
  requirements: Line[],
  processes: Proc[],
): {
  unknowns: Unknowns;
  dot?: string;
} => {
  const inputs = makeInputs(data, requirements, processes);
  const unknowns = computeUnknowns(inputs);

  updateInputsWithHints(inputs, requirements, unknowns);
  const dot = dotFor(inputs);

  return {
    unknowns,
    dot,
  };
};

const fiddleDot = (dotLines: string[]): string => {
  const bg = '#212529';
  const line = '#dee2e6'; // --bs-body-color
  const text = 'white';

  dotLines.splice(
    1,
    0,
    f`
  bgcolor="${bg}";
  edge [ color="${line}"; fontcolor="${text}"; ];
  node [ color="${line}"; fontcolor="${text}"; ];
  `,
  );

  const colourMap: Record<string, string> = {
    red: '#842029', // --bs-danger-border-subtle
    green: '#0f5132', // --bs-success-border-subtle
    '': '#343a40', // --bs-grey-dark
  };
  return dotLines
    .join('\n')
    .replace(/fillcolor="(\w*)"/g, (_, v) => `fillcolor="${colourMap[v]}"`);
};

const mainSolve = (
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

type Recommendation = 'import' | 'export';

export const computeUnknowns = (
  inputs: SolverInputs,
): Record<ItemId, Recommendation> => {
  const hasRequirements = new Set(
    inputs.requirements.map((stack) => stack.item.id),
  );
  const hasRequirement = (itemId: ItemId) => hasRequirements.has(itemId);
  const { lav: chain } = mainSolve(inputs);

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

export const applyHints = (requirements: Line[], unknowns: Unknowns) => {
  const ret: Line[] = [];

  for (const line of requirements) {
    if (line.req.op === 'auto' && !unknowns[line.item]) {
      continue;
    }
    ret.push({
      ...line,
      req: { ...line.req, hint: unknowns[line.item] },
    });
    delete unknowns[line.item];
  }

  const noExistingReqs = ret.length === 0;

  // place 'export's (recipe outputs) before imports where possible
  for (const req of ['export', 'import'] as const) {
    for (const [item] of Object.entries(unknowns)
      .filter(([, unk]) => unk === req)
      .sort()) {
      const op = req === 'export' && noExistingReqs ? 'produce' : 'auto';
      ret.push({ item, req: { op, amount: 1, hint: req } });
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
