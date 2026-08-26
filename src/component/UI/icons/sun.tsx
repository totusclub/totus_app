import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

const SunIcon = ({ size = 24, color = '#FF9500' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle
        cx="12"
        cy="12"
        r="4"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
      />
      <Path
        d="M12 2V4"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <Path
        d="M12 20V22"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <Path
        d="M4 12H2"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <Path
        d="M22 12H20"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <Path
        d="M17.6569 6.34315L16.2426 7.75736"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <Path
        d="M7.75736 16.2426L6.34315 17.6569"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <Path
        d="M17.6569 17.6569L16.2426 16.2426"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <Path
        d="M7.75736 7.75736L6.34315 6.34315"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </Svg>
  );
};

export default SunIcon;
