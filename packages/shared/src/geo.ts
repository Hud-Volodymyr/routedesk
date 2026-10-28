export type Position = [longitude: number, latitude: number];

export interface GeoJsonPoint {
  type: 'Point';
  coordinates: Position;
}

// A route's path: the ordered positions from the depot through each stop.
export interface GeoJsonLineString {
  type: 'LineString';
  coordinates: Position[];
}

// A zone's area.
export interface GeoJsonPolygon {
  type: 'Polygon';
  coordinates: Position[][];
}
