import React from 'react';
import HotelCardBase, { type HotelInfo as BaseHotelInfo } from '../UI/hotelCard';

export type HotelInfo = BaseHotelInfo;

/** Thin re-export used by search results list. */
const HotelCard = HotelCardBase;
export default HotelCard;
