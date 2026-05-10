/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Location {
  lat: number;
  lng: number;
}

export enum PoiType {
  CAMPSITE = 'campsite',
  STELLPLATZ = 'stellplatz',
  EB_CHARGER = 'eb_charger',
  HOTEL = 'hotel',
  TRAIN_STATION = 'train_station',
}

export interface POI {
  id: string;
  type: PoiType;
  lat: number;
  lng: number;
  name: string;
  tags: Record<string, string>;
}

export interface RoutePoint {
  lat: number;
  lng: number;
  ele?: number;
  time?: Date;
}

export interface Route {
  points: RoutePoint[];
  name?: string;
  distance?: number;
}
