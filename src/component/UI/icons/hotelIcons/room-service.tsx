import React from 'react';
import Svg, { Path, G } from 'react-native-svg';

type RoomServiceIconProps = {
  size?: number;
  color?: string;
};

const RoomServiceIcon: React.FC<RoomServiceIconProps> = ({ size = 24, color = '#4D4D4D' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G fill="none" fillRule="evenodd" stroke={color}>
        <Path stroke={color} d="M20.532 11.461c0 .912-.2 2.104-2.134 2.104s-2.882-1.844-2.882-2.104M6.339 5.318q.955-.312.955-.725c.367.467 1.297 1.087 3.98.725">
        </Path>
        <Path stroke={color} d="M6.04 9.7Q4.66 8.304 4.66 7.344q0-.958 1.057-.463-.596-4.569 3.308-4.569T13.042 5.2q-.248-.237-.78 0 .068.611 0 1.681 1.567-.369 1.036 1.027c-.533 1.395-1.87 3.91-4.252 3.91q-1.67-.099-3.007-2.116z">
        </Path>
        <Path stroke={color} d="M18.511 13.34v2.717c-.062.897-.343 1.345-.898 1.345-.832 0-1.93-1.345-3.109-1.345a797 797 0 0 0 0 4.456H3.51v-5.447q0-1.351 1.082-2.165 1.08-.815 2.74-1.418.8 4.574 1.741 4.574t2.017-4.574q2.99.64 5.217 2.836a189 189 0 0 1 0-1.878M14.5 11.5h7V10a3.5 3.5 0 0 0-7 0zm-1.5 0h9.919">
        </Path>
      </G>
    </Svg>
  );
};

export default RoomServiceIcon;