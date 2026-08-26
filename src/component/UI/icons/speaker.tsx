import React from 'react';
import Svg, { Path } from 'react-native-svg';

const SpeakerIcon = ({ size = 24, color = 'black' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Path d="M9.54007 11C9.83199 11 10.1093 10.8724 10.2993 10.6508L14.2407 6.05247C14.8449 5.34757 16 5.77485 16 6.70326V25.2967C16 26.2252 14.8449 26.6524 14.2407 25.9475L10.2993 21.3492C10.1093 21.1276 9.83199 21 9.54007 21H6C5.44772 21 5 20.5523 5 20V12C5 11.4477 5.44772 11 6 11H9.54007Z" fill={color} />
      <Path d="M22.5 11.5C22.5 11.5 24 13.5 24 16C24 18.5 22.5 20.5 22.5 20.5M24.5 7.5C24.5 7.5 28 11.2778 28 16C28 20.7222 24.5 24.5 24.5 24.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </Svg>


  );
};

export default SpeakerIcon;
