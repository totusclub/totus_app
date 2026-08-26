import React from 'react';
import Svg, { Path } from 'react-native-svg';

const AccountIcon = ({ size = 24, color = 'black' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M11.9989 17C15.6613 17 18.8639 18.5751 20.606 20.9247L18.764 21.796C17.3463 20.1157 14.8463 19 11.9989 19C9.15151 19 6.65155 20.1157 5.23382 21.796L3.39258 20.9238C5.13479 18.5747 8.33699 17 11.9989 17ZM11.9989 2C14.7603 2 16.9989 4.23858 16.9989 7V10C16.9989 12.7614 14.7603 15 11.9989 15C9.2375 15 6.99893 12.7614 6.99893 10V7C6.99893 4.23858 9.2375 2 11.9989 2Z" fill={color} />
    </Svg>

  );
};

export default AccountIcon;
