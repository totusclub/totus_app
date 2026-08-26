import React from 'react';
import Svg, { Path, G, Circle, Rect } from 'react-native-svg';

type LoungeIconProps = {
  size?: number;
  color?: string;
};

const LoungeIcon: React.FC<LoungeIconProps> = ({ size = 24, color = '#4D4D4D' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G fill="none" fillRule="evenodd" transform="translate(2 5)">
        <Path fill={color} d="M3 13h3v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zm11 0h3v1a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1z"></Path>
        <Path stroke={color} d="M14.333 8.54a2.08 2.08 0 0 0 1.177-1.885l.01-.416c.102-1.166 1.064-2.08 2.235-2.08C18.995 4.16 20 5.183 20 6.447s-1.005 2.287-2.245 2.287q-.104 0-.204-.009v2.505c0 1.148-.914 2.08-2.04 2.08H4.49c-1.127 0-2.041-.932-2.041-2.08V8.725q-.1.01-.204.01C1.005 8.734 0 7.71 0 6.446s1.005-2.288 2.245-2.288c1.17 0 2.133.914 2.236 2.08l.009.416a2.08 2.08 0 0 0 1.286 1.933M2.513 4.14Q2.224.025 6.63.024h7.613q3.276.176 3.276 4.118"></Path>
        <Circle cx="7.5" cy="3.5" r="1" fill={color}></Circle>
        <Circle cx="12.5" cy="3.5" r="1" fill={color}></Circle>
        <Rect width="9" height="2" x="5.5" y="8.5" stroke={color} rx="1"></Rect>
      </G>
    </Svg>
  );
};

export default LoungeIcon;