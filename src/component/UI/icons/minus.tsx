import React from 'react';
import Svg, { Path } from 'react-native-svg';

const MinusIcon = ({ size = 20, color = '#1F1F1F' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M4.1665 10H15.8332"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export default MinusIcon;

