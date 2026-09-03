import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

/** "×" inside a semi-transparent circle (used on removable filter chips). */
const CloseCircleIcon = ({ size = 20, color = '#FFFFFF' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Circle cx="10" cy="10" r="10" fill={color} fillOpacity={0.3} />
      <Path
        d="M13 7L7 13M7 7L13 13"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export default CloseCircleIcon;
