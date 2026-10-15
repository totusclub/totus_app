import React from 'react';
import TotusIcon, { type TotusIconProps } from './TotusIcon';
import { TOTUS_ICONS, type TotusIconKey } from './registry.generated';

/**
 * Иконка по ключу — когда ключ приходит из данных (удобства номера, питание, фильтры).
 *   <TotusIconByKey name={roomFacilityIcon(facility.group_identifier, facility.name)} color={theme.text} />
 */
export interface TotusIconByKeyProps extends Omit<TotusIconProps, 'icon'> {
  name: TotusIconKey;
}

const TotusIconByKey = ({ name, ...rest }: TotusIconByKeyProps) => {
  const icon = TOTUS_ICONS[name];
  if (!icon) return null;
  return <TotusIcon icon={icon} {...rest} />;
};

export default TotusIconByKey;
