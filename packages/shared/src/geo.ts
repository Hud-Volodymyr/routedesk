export type Position = [longitude: number, latitude: number];

export interface GeoJsonPoint {
  type: 'Point';
  coordinates: Position;
}
