import type { GeoJsonPoint } from '@routedesk/shared';

export interface StoreWithDistance {
  id: string;
  name: string;
  location: GeoJsonPoint;
  distanceM: number;
}

export interface StoreZone {
  id: string;
  name: string;
  priority: number;
  depotId: string;
}

export interface StoreZoneResponse {
  zone: StoreZone | null;
}
