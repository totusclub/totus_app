import React from 'react';
import Svg, { Path, G } from 'react-native-svg';

type ToiletryIconProps = {
  size?: number;
  color?: string;
};

const ToiletryIcon: React.FC<ToiletryIconProps> = ({ size = 24, color = '#4A4A4A' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G fill="none" fillRule="evenodd">
        <Path stroke={color} d="M5.5 16.5v2.677l-.994 1.06v.263H7.5v-4zm6-6h6v10h-6zm7-7v.518l.348 1.018-.324.96.32 1.117-.344 1.015V8.5h2v-5zm-6 4h4v3h-4zm-7.6 9h3.188L9.575 4.06a.5.5 0 0 0-.497-.56h-5.16a.5.5 0 0 0-.496.559z"></Path>
        <Path stroke={color} d="M14.5 12.5h3v6h-3z"></Path>
        <Path stroke={color} d="M20.495 3.028v18M3.574 5.55h5.761"></Path>
      </G>
    </Svg>
  );
};

export default ToiletryIcon;