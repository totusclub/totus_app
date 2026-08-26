import React from 'react';
import Tickets from '../../component/tickets/Tickets';
import { Content } from '../../component/UI';
import { TicketsFiltersProvider } from '../../component/tickets/TicketsFiltersContext';

const TicketsScreen = () => {
  return (
    <Content>
      <TicketsFiltersProvider>
        <Tickets />
      </TicketsFiltersProvider>
    </Content>
  );
};

export default TicketsScreen;

