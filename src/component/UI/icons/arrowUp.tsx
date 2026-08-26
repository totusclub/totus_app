import React from 'react';
import Svg, { Path } from 'react-native-svg';

const ArrowUp = ({ size = 24, color = '#1F1F1F' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M11.8336 11.4628L7.29636 16L6 14.7036L11.8336 8.87L17.6672 14.7036L16.3709 16L11.8336 11.4628Z"
        fill={color}
        fillOpacity="0.4"
      />
    </Svg>
  );
};

export default ArrowUp;

