import React from 'react';
import Svg, { Path } from 'react-native-svg';

const WarningIcon = ({ size = 18, color = 'white' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path fillRule="evenodd" clipRule="evenodd" d="M20 10C20 15.5228 15.5228 20 10 20C4.47715 20 0 15.5228 0 10C0 4.47715 4.47715 0 10 0C15.5228 0 20 4.47715 20 10ZM10 8.25C10.4142 8.25 10.75 8.58579 10.75 9V15C10.75 15.4142 10.4142 15.75 10 15.75C9.58579 15.75 9.25 15.4142 9.25 15V9C9.25 8.58579 9.58579 8.25 10 8.25ZM10 6.75C10.6904 6.75 11.25 6.19036 11.25 5.5C11.25 4.80964 10.6904 4.25 10 4.25C9.30964 4.25 8.75 4.80964 8.75 5.5C8.75 6.19036 9.30964 6.75 10 6.75Z" fill={color} />
    </Svg>

  );
};

export default WarningIcon;


