import React from 'react';
import { Checkout } from '../../component/checkout/Checkout';
import { Content } from '../../component/UI';

const CheckoutScreen = () => (
  <Content hasBottomTabBar={false}>
    <Checkout />
  </Content>
);

export default CheckoutScreen;
