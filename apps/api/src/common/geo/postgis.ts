import { type Expression, sql, type RawBuilder } from 'kysely';
import type { Geography } from '../db/geography.js';

export function point(lng: number, lat: number): RawBuilder<Geography> {
  return sql<Geography>`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography`;
}

export function asGeoJson<T>(location: Expression<Geography>): RawBuilder<T> {
  return sql<T>`ST_AsGeoJSON(${location})::json`;
}

export function distance(
  location: Expression<Geography>,
  point: Expression<Geography>,
): RawBuilder<number> {
  return sql<number>`ST_Distance(${location}, ${point})`;
}

export function dWithin(
  location: Expression<Geography>,
  point: Expression<Geography>,
  radiusM: number,
): RawBuilder<boolean> {
  return sql<boolean>`ST_DWithin(${location}, ${point}, ${radiusM})`;
}

export function covers(
  area: Expression<Geography>,
  location: Expression<Geography>,
): RawBuilder<boolean> {
  return sql<boolean>`ST_Covers(${area}, ${location})`;
}

export function nearest(
  a: Expression<Geography>,
  b: Expression<Geography>,
): RawBuilder<number> {
  return sql<number>`${a} <-> ${b}`;
}
