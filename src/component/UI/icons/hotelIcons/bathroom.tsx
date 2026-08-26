import React from 'react';
import Svg, { Path, G } from 'react-native-svg';

type BathroomIconProps = {
  size?: number;
  color?: string;
};

const BathroomIcon: React.FC<BathroomIconProps> = ({ size = 24, color = '#4A4A4A' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G fill="none" fillRule="evenodd">

        <Path fill={color} d="M15.5 4A1.5 1.5 0 0 1 17 5.5V6h-3v-.5A1.5 1.5 0 0 1 15.5 4"></Path>
        <Path stroke={color} d="M21.507 12.506a1 1 0 0 0 1-1V11.5a1 1 0 0 0-1-1H2.497a1 1 0 0 0-1 1v.006a1 1 0 0 0 1 1z"></Path>
        <Path stroke={color} d="M2.528 12.506v3.01a4 4 0 0 0 4 4l10.936-.05a4 4 0 0 0 4-4v-2.96"></Path>
        <Path stroke={color} d="M6.516 19.48a2.03 2.03 0 0 1-2.03 2.03h-.45m13.437-2.03c0 1.122.91 2.03 2.03 2.03h.45"></Path>
      </G>
    </Svg>
  );
};

export default BathroomIcon;