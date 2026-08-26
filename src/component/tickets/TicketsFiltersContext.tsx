import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  ReactNode,
} from 'react';

type TicketsFiltersContextType = {
  filters: any;
  setFilters: (filters: any) => void;
  packageInfo: any;
  setPackageInfo: (packageInfo: any) => void;
  selectedFilters: Record<string, string[]>;
  setSelectedFilters: (filters: Record<string, string[]>) => void;
  filtersModalVisible: boolean;
  setFiltersModalVisible: (visible: boolean) => void;
};

const TicketsFiltersContext = createContext<TicketsFiltersContextType | undefined>(
  undefined,
);

export const TicketsFiltersProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>(
    {},
  );
  const [filtersModalVisible, setFiltersModalVisible] = useState(false);
  const [filters, setFilters] = useState<any>(null);
  const [packageInfo, setPackageInfo] = useState<any>(null);

  const value = useMemo(
    () => ({
      filters,
      setFilters,
      packageInfo,
      setPackageInfo,
      selectedFilters,
      setSelectedFilters,
      filtersModalVisible,
      setFiltersModalVisible,
    }),
    [filters, packageInfo, selectedFilters, filtersModalVisible],
  );

  return (
    <TicketsFiltersContext.Provider value={value}>
      {children}
    </TicketsFiltersContext.Provider>
  );
};

export const useTicketsFilters = () => {
  const context = useContext(TicketsFiltersContext);
  if (!context) {
    throw new Error('useTicketsFilters must be used within TicketsFiltersProvider');
  }
  return context;
};
