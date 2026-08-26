import React from 'react';
import Svg, { ClipPath, Defs, G, Path, Rect } from 'react-native-svg';

const PhoneIcon = ({ size = 24, color = '#1F1F1F' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G clipPath="url(#clip0_345_8947)">
        <Path d="M20.5086 19.067C14.8423 29.3198 -5.31925 9.15852 4.93437 3.49281C5.53758 3.1595 6.2795 3.39578 6.67463 3.96043L8.77962 6.96854C9.19684 7.56476 9.12593 8.37444 8.61143 8.88907L7.37085 10.13C6.86543 10.6355 6.78353 11.4306 7.19918 12.0122C8.65249 14.0458 9.95465 15.3479 11.9886 16.8017C12.5703 17.2174 13.3656 17.1355 13.8711 16.6299L15.1118 15.3892C15.6265 14.8745 16.4364 14.8036 17.0326 15.221L20.0411 17.3267C20.6057 17.7219 20.8419 18.4638 20.5086 19.067Z" fill={color} />
      </G>
      <Defs>
        <ClipPath id="clip0_345_8947">
          <Rect width="24" height="24" fill="white" />
        </ClipPath>
      </Defs>
    </Svg>

  );
};

export default PhoneIcon;


