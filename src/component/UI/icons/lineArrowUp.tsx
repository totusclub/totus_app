import React from 'react';
import Svg, { Path, Ellipse } from 'react-native-svg';

const LineArrowDownIcon = ({ size = 24, color = 'white' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 20L12 3.99988M12 3.99988L6 9.99999M12 3.99988L18 9.99999" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
};

export default LineArrowDownIcon;
