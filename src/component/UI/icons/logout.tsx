import React from 'react';
import Svg, { Path } from 'react-native-svg';

const LogoutIcon = ({ size = 24, color = 'white' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 6V4C4 2.89543 4.89543 2 6 2H18C19.1046 2 20 2.89543 20 4V20C20 21.1046 19.1046 22 18 22H6C4.89543 22 4 21.1046 4 20V18M15 12H4M4 12L8.5 8M4 12L8.5 16" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>

  );
};

export default LogoutIcon;
