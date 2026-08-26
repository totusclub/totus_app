import React from 'react';
import Svg, { Path, G } from 'react-native-svg';

type ShowerIconProps = {
  size?: number;
  color?: string;
};

const ShowerIcon: React.FC<ShowerIconProps> = ({ size = 24, color = '#4D4D4D' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G fill="none" fillRule="evenodd" stroke={color}>
        <Path d="M11.007 2.013v3.905m2.016-3.914v3.782m-6.207 4.868q.707-4.684 5.185-4.684t5.184 4.684"></Path>
        <Path d="M5.5 10.5h13v2h-13z"></Path>
        <Path strokeDasharray="1" d="m8.873 14.316-3.424 7.185m10-7.185 3.424 7.185m-8.508-6.851-1.57 6.7m4.805-6.601 1.706 6.475m-3.299-6.501v6.536"></Path>
      </G>
    </Svg>
  );
};

export default ShowerIcon;