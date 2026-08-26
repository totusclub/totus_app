import React from 'react';
import Svg, { Path } from 'react-native-svg';

const ArrowDown = ({ size = 24, color = 'white' }) => {
  return (
    <Svg width={size} height="24" viewBox="0 0 24 24" fill="none">
      <Path
        d="M11.8336 12.5372L16.3709 8L17.6672 9.29636L11.8336 15.13L6 9.29636L7.29636 8L11.8336 12.5372Z"
        fill={color}
        fill-opacity="0.4"
      />
    </Svg>
  );
};

export default ArrowDown;
