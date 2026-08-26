import React from 'react';
import Svg, { Path, Rect, G, Defs, ClipPath } from 'react-native-svg';

interface HeartIconProps {
  size?: number;
  color?: string;
  filled?: boolean;
}

const HeartIcon: React.FC<HeartIconProps> = ({ size = 24, color = '#1F1F1F', filled = false }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <G clipPath="url(#clip0_130_416)">
        <Path
          d="M10.442 4.63281C12.1506 2.92438 14.921 2.9243 16.6295 4.63281C18.3379 6.34133 18.3379 9.1118 16.6295 10.8203L10.7369 16.7129C10.3301 17.1197 9.6701 17.1197 9.26331 16.7129L3.37073 10.8203C1.66218 9.11177 1.66218 6.34136 3.37073 4.63281C5.07927 2.92427 7.84968 2.92427 9.55823 4.63281L9.99963 5.0752L10.442 4.63281Z"
          stroke={color}
          strokeWidth={1.25}
          fill={filled ? color : 'none'}
        />
      </G>
      <Defs>
        <ClipPath id="clip0_130_416">
          <Rect width="20" height="20" rx="3.33333" fill="white" />
        </ClipPath>
      </Defs>
    </Svg>
  );
};

export default HeartIcon;