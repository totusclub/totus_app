import React from 'react';
import TotusIconByKey from '../totus/TotusIconByKey';
import { amenityIcon, roomFacilityIcon } from '../totus/ltIcons';
import type { TotusIconKey } from '../totus/registry.generated';

/**
 * Иконки удобств отеля и номера — из набора Totus (стиль C), тот же набор, что на сайте.
 * name — group_identifier удобства номера Level.Travel (/hotels-rooms → facilities),
 * либо прежние ключи удобств отеля (pool, skiLift…). Неизвестный ключ — запасная иконка
 * «Другое удобство». label — название удобства: по нему подбирается иконка, если группы нет.
 */
const HOTEL_KEYS: Record<string, TotusIconKey> = {
  airport: 'to-airport',
  construction: 'built',
  renovation: 'renovation',
  beach: 'rest-beach',
  beachSize: 'beach-length',
  beachType: 'beach-own',
  beachSurface: 'surface-sand',
  area: 'area',
  line: 'line',
  skiLift: 'ski-lift',
  sliIn: 'ski-in',
  skiIn: 'ski-in',
  skiOut: 'ski-out',
  fitness: 'fitness',
  nanny: 'nanny',
  kidsMenu: 'kids-menu',
  kidsPool: 'kids-pool',
  kidsClub: 'kids-club',
  pool: 'pool',
  heatedPool: 'heated-pool',
  indoorPool: 'indoor-pool',
  parking: 'parking',
  massage: 'massage',
  thermalFun: 'thermal',
  bar: 'bar',
  aquaPark: 'aquapark',
  onlyAdults: 'adults-only',
  noSingleMen: 'no-single-men',
};

interface HotelIconsProps {
  name: string | null | undefined;
  label?: string | null;
  size?: number;
  color?: string;
}

export const hotelIconKey = (name: string | null | undefined, label?: string | null): TotusIconKey => {
  const key = String(name ?? '');
  return HOTEL_KEYS[key] ?? amenityIcon(key) ?? roomFacilityIcon(key, label);
};

const HotelIcons = ({ name, label, size = 24, color = 'black' }: HotelIconsProps) => (
  <TotusIconByKey name={hotelIconKey(name, label)} size={size} color={color} />
);

export default HotelIcons;
