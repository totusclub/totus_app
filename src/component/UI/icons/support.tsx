import React from 'react';
import Svg, {Path} from 'react-native-svg';

const SupportIcon = ({size = 24, color = 'black'}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 19H11V17H13V19ZM15.07 11.25L14.17 12.17C13.45 12.9 13 13.5 13 15H11V14.5C11 13.67 11.45 12.9 12.17 12.17L13.27 11.07C13.57 10.77 13.75 10.35 13.75 9.92C13.75 9.09 13.08 8.42 12.25 8.42C11.42 8.42 10.75 9.09 10.75 9.92H8.75C8.75 7.68 10.51 5.92 12.75 5.92C15 5.92 16.75 7.68 16.75 9.92C16.75 10.85 16.35 11.7 15.07 11.25Z"
        fill={color}
      />
    </Svg>
  );
};

export default SupportIcon;


