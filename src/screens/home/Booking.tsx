import React from 'react';
import { Booking } from '../../component/booking/Booking';
import { Content } from '../../component/UI';

const BookingScreen = () => {
  return (
    <Content hasBottomTabBar={false}>
      <Booking />
    </Content>
  );
};

export default BookingScreen;

