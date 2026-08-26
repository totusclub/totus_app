import React from 'react';
import Svg, { Path, Ellipse } from 'react-native-svg';

const InfoIcon = ({ size = 24, color = 'white' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path fillRule="evenodd" clipRule="evenodd" d="M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12ZM12 10.25C12.4142 10.25 12.75 10.5858 12.75 11V17C12.75 17.4142 12.4142 17.75 12 17.75C11.5858 17.75 11.25 17.4142 11.25 17V11C11.25 10.5858 11.5858 10.25 12 10.25ZM12 8.75C12.6904 8.75 13.25 8.19036 13.25 7.5C13.25 6.80964 12.6904 6.25 12 6.25C11.3096 6.25 10.75 6.80964 10.75 7.5C10.75 8.19036 11.3096 8.75 12 8.75Z" fill={color} />
    </Svg>

  );
};

export default InfoIcon;
