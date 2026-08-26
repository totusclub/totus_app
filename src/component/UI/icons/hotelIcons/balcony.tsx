import React from 'react';
import Svg, { Path, G } from 'react-native-svg';

type BalconyIconProps = {
  size?: number;
  color?: string;
};

const BalconyIcon: React.FC<BalconyIconProps> = ({ size = 24, color = '#4A4A4A' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G fill="none" fillRule="evenodd">
        <Path fill={color} d="M4 20h16v2H4z"></Path>
        <Path stroke={color} d="M18.581 20.935q2.482-1.875 2.482-4.479t-1.117-3.781m-14.883 8.26q-2.482-1.875-2.482-4.479t1.117-3.781"></Path>
        <Path stroke={color} d="M4.043 11.576q-.351-.53-.87-.53c-.517 0-.865.382-.865.884 0 .501.212.895 1.295.895h8.619"></Path>
        <Path stroke={color} d="M19.487 11.576q.351-.53.869-.53c.518 0 .866.382.866.884 0 .501-.212.895-1.296.895h-8.618m.645.34v6.927m-2.957-6.965q-.654 3.39 0 7m-2.701-7.004q-1.287 3.536.318 7.072m7.729-7.068q.654 3.39 0 7m2.808-7.004q1.287 3.536-.318 7.072m-9.698-8.799V2.252h9.68v9.18m-4.742-.197V2.553"></Path>
      </G>
    </Svg>
  );
};

export default BalconyIcon;