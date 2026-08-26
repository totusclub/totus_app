import React from 'react';
import Svg, { Path } from 'react-native-svg';

const MoonIcon = ({ size = 24, color = '#7A7A7A' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7.00781 2.55664C7.15877 2.45155 7.30764 2.4675 7.44922 2.58691C7.60572 2.71917 7.71183 2.95827 7.66797 3.21387C7.55781 3.85309 7.5 4.5107 7.5 5.18066C7.50012 11.5318 12.6488 16.6807 19 16.6807C19.6699 16.6807 20.3267 16.6228 20.9658 16.5127C21.2217 16.4686 21.4615 16.5747 21.5938 16.7314C21.713 16.8729 21.7288 17.0211 21.624 17.1719C19.7263 19.8977 16.5711 21.6807 13 21.6807C7.20109 21.6807 2.50012 16.9796 2.5 11.1807C2.5 7.60964 4.28206 4.45434 7.00781 2.55664Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
};

export default MoonIcon;
