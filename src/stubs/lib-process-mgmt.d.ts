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
      groups: [] | null,
      duration_modifier?: number,
      output_modifier?: number,
    );
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
  import type { Process } from 'process-mgmt/src/process.js';
  import type { Factory } from 'process-mgmt/src/structures.js';

  export class RateVisitor {
    constructor(rateify: (proc: Process) => Factory | undefined);
  }
}

declare module 'process-mgmt/src/visit/linear_algebra_visitor.js' {
  import type { Item, Stack } from 'process-mgmt/src/structures.js';

  type BareItemName = string;

  export class LinearAlgebra {
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
  export class ProcessCountVisitor {
    constructor();
    visit(process: any): void;
  }
}

declare module 'process-mgmt/src/process.js' {
  import { FactoryGroup, Stack } from 'process-mgmt/src/structures.js';

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

    // incomplete
  }

  export class ProcessChain {
    constructor(procs: Process[]);
    // sometimes returns a chain, sometimes returns a string
    accept(visitor: any): any;
    process_counts: Record<string, number>;
  }
}

declare module 'process-mgmt/src/visit/rate_graph_renderer.js' {
  export class RateGraphRenderer {
    constructor();
    visit(process: unknown): void;
  }
}
