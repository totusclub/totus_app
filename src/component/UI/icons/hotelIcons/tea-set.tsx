import React from 'react';
import Svg, { Path, G, Circle } from 'react-native-svg';

const TeaSetIcon = ({ size = 24, color = '#1F1F1F' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G fill="none" fillRule="evenodd" stroke={color} transform="translate(3 4)">
        <Path d="M12.653.504q2.64-.152 3.142 1.98.503 2.135.977 4.44 1.069 5.142-3.772 5.142M1.771.481h1.59l-.362 4.972L.915 1.998A1 1 0 0 1 1.771.48zm3.215 1.728-.73 9.796"></Path>
        <Path d="m3.337.5-.937 15h10.935l-.937-15h-9.06z"></Path>
        <Circle cx="10.867" cy="13" r="1"></Circle>
      </G>
    </Svg>
  );
};

export default TeaSetIcon;