import React from 'react';
import Svg, {Path} from 'react-native-svg';

const ProblemIcon = ({size = 24, color = 'black'}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M7.50008 4.16699H6.16675C5.06218 4.16699 4.16675 5.06242 4.16675 6.16699V15.5003C4.16675 16.6049 5.06218 17.5003 6.16675 17.5003H7.50008M12.5001 4.16699H13.8334C14.938 4.16699 15.8334 5.06242 15.8334 6.16699V7.50033"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12.3688 16.9552L10.5961 17.3097L10.9506 15.5369C10.9894 15.3434 11.0845 15.1656 11.2241 15.026L14.5833 11.6667L16.25 10L17.9057 11.6557L16.2391 13.3224L12.8798 16.6817C12.7402 16.8213 12.5624 16.9164 12.3688 16.9552Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M7.5 4.5C7.5 3.39543 8.39543 2.5 9.5 2.5H10.5C11.6046 2.5 12.5 3.39543 12.5 4.5V5.83333H7.5V4.5Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export default ProblemIcon;
