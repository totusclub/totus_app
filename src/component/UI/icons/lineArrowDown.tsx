import React from 'react';
import Svg, { Path, Ellipse } from 'react-native-svg';

const LineArrowDownIcon = ({ size = 24, color = 'white' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3.99994L12 20.0001M12 20.0001L18 13.9999M12 20.0001L6 13.9999" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>

  );
};

export default LineArrowDownIcon;
