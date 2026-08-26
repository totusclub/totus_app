import React from 'react';
import Svg, {Path} from 'react-native-svg';

const EditIcon = ({size = 24, color = 'white'}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M15.3153 7.04178L7.54095 14.8163C7.26175 15.0955 6.90615 15.2858 6.51896 15.3632L4.16648 15.8337L4.63698 13.4812C4.71442 13.094 4.90473 12.7384 5.18392 12.4592L12.9583 4.68476M15.3153 7.04178L16.376 5.98112C16.7665 5.5906 16.7665 4.95743 16.376 4.56691L15.4332 3.6241C15.0427 3.23357 14.4095 3.23357 14.019 3.6241L12.9583 4.68476M15.3153 7.04178L12.9583 4.68476"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export default EditIcon;
