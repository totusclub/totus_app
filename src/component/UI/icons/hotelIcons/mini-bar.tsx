import React from 'react';
import Svg, { Path, G, Rect } from 'react-native-svg';

const MiniBarIcon = ({ size = 24, color = '#1F1F1F' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G fill="none" fillRule="evenodd" stroke={color} transform="translate(3 3)">
        <Rect width="17" height="17" x="0.5" y="0.5" rx="1"></Rect>
        <Path d="M11.656 4.333V2.529h2.27v1.769a3 3 0 0 0 .368 1.44l.322.588c.452.827.69 1.755.69 2.698v5.467a1 1 0 0 1-1 1h-3.01a1 1 0 0 1-1-1v-5.34a6 6 0 0 1 .674-2.762l.35-.675a3 3 0 0 0 .336-1.381zm.214-.423h2.024"></Path>
        <Path d="M15.206 8.17h-2.562v5.417h2.562M4.483 9.532v4.092M3.5 5.5h3v2h-3z"></Path>
        <Path d="M6.516 10.501h2.98a1 1 0 0 1 1 1v.03a1 1 0 0 1-1 1H7.98l1.55-.002a.952.952 0 1 1 0 1.905H7.98h1.515a1 1 0 0 1 1 .999v.076a1 1 0 0 1-1 1H7.98h1.524a.99.99 0 1 1 0 1.98H7.98h1.524a1 1 0 0 1 1 .999v.076a1 1 0 0 1-1 1H7.98h1.515a1 1 0 0 1 1 .999v.076a1 1 0 0 1-1 1H7.98l1.55-.002a.952.952 0 1 1 0 1.905H7.98h2.024"></Path>
      </G>
    </Svg>
  );
};

export default MiniBarIcon;