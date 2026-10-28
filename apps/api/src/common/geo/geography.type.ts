import { Type } from '@mikro-orm/core';
import type { GeoJsonLineString, GeoJsonPoint, GeoJsonPolygon } from '@routedesk/shared';

/**
 * Maps a GeoJSON value in code to a geography column in Postgres (SRID 4326).
 * PostGIS converts in SQL in both directions, so the app only ever handles JSON.
 *
 * Write: object -> JSON text parameter -> ST_GeomFromGeoJSON(...)::geography
 * Read:  geography column -> ST_AsGeoJSON(column) -> JSON text -> object
 *
 * Subclasses only say which geometry the column holds; Postgres rejects any other shape.
 */
abstract class GeographyType<T> extends Type<T, string> {
  protected abstract readonly geometry: 'Point' | 'LineString' | 'Polygon';

  override getColumnType(): string {
    return `geography(${this.geometry}, 4326)`;
  }

  override convertToDatabaseValue(value: T): string {
    return JSON.stringify(value);
  }

  override convertToDatabaseValueSQL(key: string): string {
    return `ST_SetSRID(ST_GeomFromGeoJSON(${key}), 4326)::geography`;
  }

  override convertToJSValueSQL(key: string): string {
    return `ST_AsGeoJSON(${key})`;
  }

  override convertToJSValue(value: string): T {
    return JSON.parse(value) as T;
  }
}

export class PointType extends GeographyType<GeoJsonPoint> {
  protected readonly geometry = 'Point';
}

export class LineStringType extends GeographyType<GeoJsonLineString> {
  protected readonly geometry = 'LineString';
}

export class PolygonType extends GeographyType<GeoJsonPolygon> {
  protected readonly geometry = 'Polygon';
}
