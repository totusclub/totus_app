import React from 'react';
import Svg, { Path, G, Ellipse, Rect } from 'react-native-svg';

type ToiletIconProps = {
  size?: number;
  color?: string;
};

const ToiletIcon: React.FC<ToiletIconProps> = ({ size = 24, color = '#4A4A4A' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G fill="none" fillRule="evenodd" stroke={color} transform="translate(5 2)">
        <Path stroke={color} d="M10.71 11.473c.949-1.217 1.535-2.89 1.535-4.738C12.245 3.015 9.869 0 6.939 0S1.633 3.015 1.633 6.735c0 1.846.585 3.52 1.534 4.736"></Path>
        <Ellipse cx="6.939" cy="6.735" rx="3.265" ry="4.286"></Ellipse>
        <Rect width="13" height="2" x="0.5" y="11.5" rx="1"></Rect>
        <Path stroke={color} d="M1.527 13.5A4.5 4.5 0 0 0 6 17.5h2a4.5 4.5 0 0 0 4.473-4z"></Path>
        <Path strokeWidth="2" d="m9.358 18.145-4.664-.064A3 3 0 0 0 4.17 19h5.66a3 3 0 0 0-.472-.855z">
        </Path>
      </G>
    </Svg>
  );
};

export default ToiletIcon;