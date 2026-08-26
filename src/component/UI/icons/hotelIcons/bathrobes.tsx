import React from "react";
import Svg, { G, Path } from "react-native-svg";

type BathrobesIconProps = {
  size?: number;
  color?: string;
};

const BathrobesIcon: React.FC<BathrobesIconProps> = ({ size = 24, color = '#4D4D4D' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G fill="none" fillRule="evenodd" stroke={color}>
        <Path stroke={color} d="m9.192 3.33 2.534 5.355 2.493-5.187-4.17 8.706">
        </Path>
        <Path stroke={color} d="M7.491 15h8.998m-5.963 6v-5.929m-.503 5.647h6.616V9.496l2.276 1.22 1.766-2.64-5.712-4.745H9.192l-5.89 4.744 1.817 2.642 2.24-1.221v11.222h1.657">
        </Path>
      </G>
    </Svg>
  );
};

export default BathrobesIcon;