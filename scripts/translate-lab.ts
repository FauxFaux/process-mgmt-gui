#!/usr/bin/env -S tsx
import { copyFileSync, writeFileSync } from 'node:fs';
import { pascalSnakeCase } from 'change-case';
import type { ModData } from 'factoriolab/src/app/models';

import { LabItem, toLab, DataSetId, loadProcMgmt } from '../src/data';

async function main() {
  const fromLab = Object.entries(toLab).reduce(
    (acc, [id, labId]) => {
      if (!labId) return acc;
      if (!acc[labId]) acc[labId] = [];
      acc[labId].push(id as DataSetId);
      return acc;
    },
    {} as Record<string, DataSetId[]>,
  );

  const labIds = new Set(Object.values(toLab).filter((id) => id));
  for (const labId of labIds) {
    if (!labId) continue;
    const lab: ModData = (
      await import(`factoriolab/src/data/${labId}/data.json`)
    ).default;

    const ourItems = new Set<string>();
    for (const ds of fromLab[labId]) {
      const us = await loadProcMgmt(ds);
      for (const item of Object.keys(us.items)) {
        ourItems.add(item);
      }
    }

    const items: Record<string, LabItem> = {};

    let convertId = (id: string) => id;
    switch (labId) {
      case 'sfy':
        convertId = (id) => id.replace(/-/g, '_');
        break;
      case 'dsp':
        convertId = (id) => pascalSnakeCase(id);
        break;
    }

    const handleBarrels = ['bobang', 'ffw', 'pysalf'].includes(labId);
    const handleContainers = ['ffw'].includes(labId);

    for (const item of lab.items) {
      const itemId = convertId(item.id);
      items[itemId] = {
        name: item.name,
      };

      if (itemId !== item.id) {
        items[itemId].labId = item.id;
      }

      if (item.stack) {
        items[itemId].stack = item.stack;
      }
    }

    for (const icon of lab.icons) {
      const itemId = convertId(icon.id);
      if (!items[itemId]) continue;
      items[itemId].iconPos = icon.position;
    }

    const handleGen = (icon: string, nameSuffix: string, idMatch: RegExp) => {
      for (const itemId of ourItems) {
        const ma = idMatch.exec(itemId);
        if (!ma) continue;
        const fluidId = ma[1];
        if (!items[fluidId]) continue;
        items[itemId] = {
          name: `${items[fluidId].name} ${nameSuffix}`,
          labId: null,
          iconPos: items[fluidId].iconPos,
          contained: true,
        };
      }
    };

    if (handleBarrels) {
      handleGen('empty-barrel', 'barrel', /(.+)-barrel/);
    }

    if (handleContainers) {
      handleGen('ic-container', 'container', /ic-container-(.+)/);
    }

    writeFileSync(
      `data/${labId}.json`,
      JSON.stringify({ items: sortByKeys(items) }, null, 2),
    );
    copyFileSync(
      `node_modules/factoriolab/src/data/${labId}/icons.webp`,
      `data/${labId}.webp`,
    );
  }
}

function sortByKeys<T>(obj: Record<string, T>): Record<string, T> {
  return Object.fromEntries(
    Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)),
  );
}

main().catch(console.error);
