import React from 'react';
import Svg, { Path, G } from 'react-native-svg';

const TvIcon = ({ size = 24, color = '#1F1F1F' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G fill="none" fillRule="evenodd" stroke={color} transform="translate(2 5)">
        <Path d="M2.5 5.5h19v11h-19zm3.5 13h12"></Path>
      </G>
    </Svg>
  );
};

export default TvIcon;