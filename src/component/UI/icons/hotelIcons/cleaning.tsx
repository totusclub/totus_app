import React from 'react';
import Svg, { Path, G, Circle } from 'react-native-svg';

type CleaningIconProps = {
  size?: number;
  color?: string;
};

const CleaningIcon: React.FC<CleaningIconProps> = ({ size = 24, color = '#4A4A4A' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G fill="none" fillRule="evenodd" transform="translate(1 2)">
        <Path fill={color} d="M2 18h2.667a2 2 0 0 1 2 2H0a2 2 0 0 1 2-2"></Path>
        <Path fill={color} d="M2.667 17.333H4a1 1 0 0 1 1 1H1.667a1 1 0 0 1 1-1"></Path>
        <Path stroke={color} d="M3.288 17.558 5.34 3.773 8.541.768A2 2 0 0 1 9.91.226h5.207a2 2 0 0 1 .77.154q5.938 2.476 5.938 8.512c0 2.67-.91 4.856-2.192 6.482m-9.225 3.016c-1.503-.424-2.558-1.383-2.558-3.525 0-3.563 5.214-3.859 7.653-3.859"></Path>
        <Path stroke={color} d="M19 13.5h-.5V10A2.5 2.5 0 0 0 16 7.5h-2a2.5 2.5 0 0 0-2.5 2.5v3.5H11a.5.5 0 0 0-.5.5v5a.5.5 0 0 0 .5.5h8a.5.5 0 0 0 .5-.5v-5a.5.5 0 0 0-.5-.5z"></Path>
        <Circle cx="15" cy="11" r="1" fill={color}></Circle>
        <Path stroke={color} d="M12.037 15.512H18m-4.974-2h3.997">
        </Path>
      </G>
    </Svg>
  );
};

export default CleaningIcon;