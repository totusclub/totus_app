import React from 'react';
import Svg, { Circle, G, Path } from 'react-native-svg';

type JacuzziIconProps = {
  size?: number;
  color?: string;
};

const JacuzziIcon: React.FC<JacuzziIconProps> = ({ size = 24, color = '#4D4D4D' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G fill="none" fillRule="evenodd" transform="translate(1 4)">
        <Circle cx="14.5" cy="7.5" r="2.5" stroke={color}></Circle>
        <Circle cx="11.5" cy="1.5" r="1.5" stroke={color}></Circle>
        <Circle cx="7" cy="6" r="1" stroke={color}></Circle>
        <Circle cx="4.5" cy="2.5" r="1" fill={color}></Circle>
        <Circle cx="17" cy="13" r="1" stroke={color}></Circle>
        <Path stroke={color} d="M5.994 6.5H1.496a1 1 0 0 0-1 1v.006a1 1 0 0 0 1 1h10.692m4.624 0h3.695a1 1 0 0 0 1-1V7.5a1 1 0 0 0-1-1H16.77m-4.51 0H8.007M1.528 8.506v3.01a4 4 0 0 0 4 4l10.936-.05a4 4 0 0 0 4-4v-2.96"></Path>
        <Path stroke={color} d="M5.516 15.48a2.03 2.03 0 0 1-2.03 2.03h-.45m13.437-2.03c0 1.122.91 2.03 2.03 2.03h.45"></Path>
      </G>
    </Svg>
  );
};

export default JacuzziIcon;