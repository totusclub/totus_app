import React from 'react';
import Svg, {Path} from 'react-native-svg';

const FaqIcon = ({size = 24, color = 'black'}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19Z"
        fill={color}
      />
      <Path
        d="M12 8C11.17 8 10.5 8.67 10.5 9.5H12.5C12.5 9.22 12.72 9 13 9C13.28 9 13.5 9.22 13.5 9.5C13.5 9.78 13.28 10 13 10C12.17 10 11.5 10.67 11.5 11.5V12.5H12.5V11.5C12.5 11.22 12.72 11 13 11C13.83 11 14.5 10.33 14.5 9.5C14.5 8.67 13.83 8 13 8H12ZM11 14V15.5H13V14H11Z"
        fill={color}
      />
    </Svg>
  );
};

export default FaqIcon;


