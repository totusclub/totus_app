import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

const ReviewIcon = ({ size = 24, color = 'black' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 14 14" fill="none"  >
      <Path d="M12.25 3.5V8.75C12.25 9.7165 11.4665 10.5 10.5 10.5H7.61387C7.21649 10.5 6.83095 10.6352 6.52065 10.8835L4.5572 12.4542C4.36623 12.607 4.08333 12.471 4.08333 12.2265V10.7917C4.08333 10.6306 3.95275 10.5 3.79167 10.5H3.5C2.5335 10.5 1.75 9.7165 1.75 8.75V3.5C1.75 2.5335 2.5335 1.75 3.5 1.75H10.5C11.4665 1.75 12.25 2.5335 12.25 3.5Z" fill={color} />
    </Svg>

  );
};

export default ReviewIcon;
