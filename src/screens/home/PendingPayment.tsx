import React from 'react';
import { PendingPayment } from '../../component/checkout/PendingPayment';
import { Content } from '../../component/UI';

const PendingPaymentScreen = () => (
  <Content hasBottomTabBar={false}>
    <PendingPayment />
  </Content>
);

export default PendingPaymentScreen;
