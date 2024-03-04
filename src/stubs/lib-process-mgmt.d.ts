declare module 'process-mgmt/src/structures.js' {
  import type { Process } from 'process-mgmt/src/process.js';

  export class Item {
    constructor(id: string, name: string, group?: string);
    id: string;
    name: string;
    group?: string;
  }

  export class Factory {
    constructor(
      id: string,
      name: string,
      groups: FactoryGroup[] | null,
      duration_modifier?: number,
      output_modifier?: number,
    );

    id: string;
    name: string;
    groups: FactoryGroup[] | null;
    duration_modifier: number;
    output_modifier: number;
  }

  export class FactoryGroup {
    constructor(name: string);
    id: string;
    name: string;
  }

  export class Stack {
    constructor(item: Item, count: number);

    item: Item;
    quantity: number;

    mul(factor: number): Stack;
  }

  export class StackSet {
    stacks: Record<string, Stack[]>;
    total_positive(item: Item): Stack;
    total_negative(item: Item): Stack;
  }

  export class Data {
    game: string;
    version: string;

    factories: Record<string, Factory>;
    items: Record<string, Item>;
    processes: Record<string, Process>;
    factory_groups: Record<string, FactoryGroup>;
  }
}

declare module 'process-mgmt/src/visit/rate_visitor.js' {
  import type { Process, ProcessChain } from 'process-mgmt/src/process.js';
  import type { Factory } from 'process-mgmt/src/structures.js';
  import { ProcessChainVisitor } from 'process-mgmt/src/visit/process_chain_visitor.js';

  export class RateVisitor extends ProcessChainVisitor<ProcessChain> {
    constructor(rateify: (proc: Process) => Factory | undefined);
  }
}

declare module 'process-mgmt/src/visit/linear_algebra_visitor.js' {
  import type { Item, Stack } from 'process-mgmt/src/structures.js';
  import type { ProcessChain } from 'process-mgmt/src/process.js';
  import { ProcessChainVisitor } from 'process-mgmt/src/visit/process_chain_visitor.js';

  type BareItemName = string;

  export class LinearAlgebra extends ProcessChainVisitor<ProcessChain> {
    constructor(
      requirements: Stack[],
      imports: BareItemName[],
      exports: BareItemName[],
      print_matrices?: boolean,
    );
    visit(process: any): void;
    print_matricies?: boolean;

    // incomplete
    items: Item[];
    mtx: number[][];
    augmented_matrix: {
      getRow: (idx: number) => { data: number[][] };
    };
  }
}

declare module 'process-mgmt/src/visit/process_count_visitor.js' {
  import type { ProcessChain } from 'process-mgmt/src/process.js';
  import { ProcessChainVisitor } from 'process-mgmt/src/visit/process_chain_visitor.js';

  export class ProcessCountVisitor extends ProcessChainVisitor<ProcessChain> {}
}

declare module 'process-mgmt/src/visit/process_chain_visitor.js' {
  import type { ProcessChain } from 'process-mgmt/src/process.js';
  import type { Item, Stack } from 'process-mgmt/src/structures.js';
  import type { Process } from 'process-mgmt/src/process.js';

  interface VisitorOptions {
    init?: true;
    visit_item?: true;
    visit_process?: true;
    visit_item_process_edge?: true;
    visit_process_item_edge?: true;
  }

  export class ProcessChainVisitor<T> {
    out: T;

    constructor();
    check(chain: ProcessChain): VisitorOptions;
    init(chain: ProcessChain): void;
    visit_item(item: Item, chain: ProcessChain): void;
    visit_process(process: Process, chain: ProcessChain): void;
    visit_item_process_edge(
      stack: Stack,
      process: Process,
      chain: ProcessChain,
      index: number,
    ): void;
    visit_process_item_edge(
      process: Process,
      stack: Stack,
      chain: ProcessChain,
      index: number,
    ): void;
    build(): T;
  }
}

declare module 'process-mgmt/src/process.js' {
  import type {
    Factory,
    FactoryGroup,
    Stack,
    StackSet,
  } from 'process-mgmt/src/structures.js';
  import type { ProcessChainVisitor } from 'process-mgmt/src/visit/process_chain_visitor.js';

  export class Process {
    // duration is execution seconds (as shown in game)
    constructor(
      id: string,
      inputs: Stack[],
      outputs: Stack[],
      duration: number,
      group: FactoryGroup,
    );
    id: string;
    duration: number;
    factory_group: FactoryGroup;
    inputs: Stack[];
    outputs: Stack[];

    // stashed here by RateVisitor during computation
    factory_type?: Factory;

    // incomplete
  }

  export class ProcessChain {
    constructor(procs: Process[]);
    accept<T>(visitor: ProcessChainVisitor<T>): T;
    process_counts: Record<string, number>;
    materials: StackSet;
    processes: Process[];
  }
}

declare module 'process-mgmt/src/visit/rate_graph_renderer.js' {
  export class RateGraphRenderer {
    constructor();
    visit(process: unknown): void;
  }
}
