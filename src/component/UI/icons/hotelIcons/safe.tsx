
import React from 'react';
import Svg, { Circle, G, Path, } from 'react-native-svg';

const SafeIcon = ({ size = 24, color = '#1F1F1F' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G fill="none" fillRule="evenodd" stroke={color} transform="translate(2 5)">
        <Path d="M.5.5h19v13H.5z"></Path>
        <Circle cx="12" cy="7" r="5"></Circle>
        <Circle cx="12" cy="7" r="2"></Circle>
        <Path strokeDasharray="1,2" strokeLinejoin="round" d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"></Path>
        <Path d="M2.727 4.649v5.056"></Path>
      </G>
    </Svg>
  );
};

export default SafeIcon;
