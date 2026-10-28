import { Type } from '@mikro-orm/core';
import type { GeoJsonPoint } from '@routedesk/shared';

export class PointType extends Type<GeoJsonPoint, string> {
  override getColumnType(): string {
    return 'geography(Point, 4326)';
  }
 
  override convertToDatabaseValue(value: GeoJsonPoint): string {
    return JSON.stringify(value);
  }
 
  override convertToDatabaseValueSQL(key: string): string {
    return `ST_SetSRID(ST_GeomFromGeoJSON(${key}), 4326)::geography`;
  }
 
  override convertToJSValueSQL(key: string): string {
    return `ST_AsGeoJSON(${key})`;
  }
 
  override convertToJSValue(value: string): GeoJsonPoint {
    return JSON.parse(value) as GeoJsonPoint;
  }
}
