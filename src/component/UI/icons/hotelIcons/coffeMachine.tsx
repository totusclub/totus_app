import React from 'react';
import Svg, { Rect, Path, Circle, G } from 'react-native-svg';

type CoffeeMachineIconProps = {
  size?: number;
  color?: string;
};

const CoffeeMachineIcon: React.FC<CoffeeMachineIconProps> = ({ size = 24, color = '#4A4A4A' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G fill="none" fillRule="evenodd" transform="translate(2 5)">
        <Rect width="19" height="13" x="0.5" y="0.5" stroke={color} rx="1"></Rect>
        <Path stroke={color} d="M2.5 2.5h12v9h-12z"></Path>
        <Path stroke={color} d="M12.5 4v5.982"></Path>
        <Circle cx="17" cy="4" r="1" stroke={color}></Circle>
        <Circle cx="17" cy="8" r="1" stroke={color}></Circle>
      </G>
    </Svg>)
}

export default CoffeeMachineIcon;