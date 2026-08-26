import React from 'react';
import Svg, { Path } from 'react-native-svg';

const DocumentIcon = ({ size = 24, color = 'white' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 22" fill="none">
      <Path d="M12 18.0001C14.7548 16.6226 17.5097 16.5101 20.2645 17.6623C20.6074 17.8058 21 17.5627 21 17.191V2.30914C21 2.11976 20.8933 1.9458 20.7219 1.86537C17.8146 0.501557 14.9073 0.546478 12 2.00019M12 18.0001V2.00019M12 18.0001C9.24516 16.6226 6.49032 16.5101 3.73548 17.6624C3.39258 17.8059 3 17.5628 3 17.1911V2.30905C3 2.11966 3.10666 1.9457 3.27812 1.86527C6.18541 0.501562 9.09271 0.54648 12 2.00019" stroke={color} stroke-width="1.5" stroke-linecap="round" />
    </Svg>

  );
};

export default DocumentIcon;
