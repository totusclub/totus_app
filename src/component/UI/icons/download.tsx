import React from 'react';
import Svg, { Path } from 'react-native-svg';

type DownloadIconProps = {
  size?: number;
  color?: string;
};

const DownloadIcon = ({ size = 24, color = '#1F1F1F' }: DownloadIconProps) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 20H20M12 15L16 11M12 15L8 11M12 15L12 2"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export default DownloadIcon;
