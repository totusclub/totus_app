import React from 'react';
import Svg, { G, Path, Circle } from 'react-native-svg';

type PhoneIconProps = {
  size?: number;
  color?: string;
};

const PhoneIcon: React.FC<PhoneIconProps> = ({ size = 24, color = '#4A4A4A' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <G fill="none" fillRule="evenodd" transform="translate(3 4)">
        <Path
          stroke={color}
          d="M11.554 4.714h-.3V5.77H6.978V4.714h-.34L3.61 7.01a3.5 3.5 0 0 0-1.277 1.916l-.586 2.271a5.5 5.5 0 0 0-.175 1.374v.799c0 .585.475 1.06 1.06 1.06h12.957c.583 0 1.055-.473 1.055-1.055v-.888a5.5 5.5 0 0 0-.134-1.208l-.506-2.248a3.5 3.5 0 0 0-1.354-2.06l-3.095-2.256z"
        />
        <Path
          stroke={color}
          d="M9.134.657c-2.124 0-4.258.18-6.411.544A2.594 2.594 0 0 0 .5 3.769v.552c0 .898.728 1.626 1.627 1.626h.511c.709 0 1.338-.455 1.56-1.128.264-.8.514-1.32.796-1.595.349-.341.914-.494 1.712-.51h4.841c.788.016 1.353.169 1.702.51.282.275.531.795.796 1.595a1.64 1.64 0 0 0 1.56 1.128h.511c.899 0 1.627-.728 1.627-1.626v-.552c0-1.29-.947-2.383-2.235-2.57A38 38 0 0 0 9.134.657z"
        />
        <Path
          fill={color}
          d="M13 14h3v1a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1zM2 14h3v1a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z"
        />
        <Circle cx="6.964" cy="7.964" r="1" stroke={color} />
        <Circle cx="6.964" cy="10.107" r="1" stroke={color} />
        <Circle cx="6.964" cy="12.25" r="1" stroke={color} />
        <Circle cx="9.107" cy="7.964" r="1" stroke={color} />
        <Circle cx="9.107" cy="10.107" r="1" stroke={color} />
        <Circle cx="9.107" cy="12.25" r="1" stroke={color} />
        <Circle cx="11.25" cy="7.964" r="1" stroke={color} />
        <Circle cx="11.25" cy="10.107" r="1" stroke={color} />
        <Circle cx="11.25" cy="12.25" r="1" stroke={color} />
      </G>
    </Svg>
  );
};

export default PhoneIcon;