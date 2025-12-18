'use client';

import Dexie, { type Table } from 'dexie';
import type { LensTrace } from '@tylo-lens/core';

export type StoredTrace = {
  traceId: string;
  updatedAt: string;
  trace: LensTrace;
};

class TyloLensDB extends Dexie {
  traces!: Table<StoredTrace, string>;

  constructor() {
    super('tylo-lens');
    this.version(1).stores({
      traces: 'traceId, updatedAt',
    });
  }
}

let _db: TyloLensDB | null = null;

export function getTraceDB(): TyloLensDB | null {
  if (typeof indexedDB === 'undefined') return null;
  if (!_db) _db = new TyloLensDB();
  return _db;
}

