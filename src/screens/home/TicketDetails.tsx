import React from 'react';
import { Content } from '../../component/UI';
import TicketDetails from '../../component/tickets/ticket/TicketDetails';

/**
 * Ticket details screen — uses the full flight UI (auth gate + segments).
 * Wrapped in Content for top safe-area inset (status bar / notch).
 */
const TicketDetailsScreen = () => (
  <Content hasBottomTabBar={false}>
    <TicketDetails />
  </Content>
);

export default TicketDetailsScreen;
