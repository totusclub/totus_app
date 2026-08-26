import React from 'react';
import Svg, { Path } from 'react-native-svg';

const ShareIcon = ({ size = 24, color = 'black' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 12V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V12M12 2L8 6M12 2L16 6M12 2V15" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>

  );
};

export default ShareIcon;
