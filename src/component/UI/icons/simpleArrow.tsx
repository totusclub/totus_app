import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SimpleArrowIcon = ({ size = 24, color = 'black' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15.0001 18L9 12L15.0001 6" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>

  );
};

export default SimpleArrowIcon;
