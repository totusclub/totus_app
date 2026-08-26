import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../modules/store';

type FiltersOpenContextValue = {
  visible: boolean;
  /** True only after the full filter tree has finished mounting. */
  bodyReady: boolean;
  /** Facets exist — start mounting the closed filter sheet. */
  shouldMountBody: boolean;
  /** Measured screen area below the status bar (safe-area container). */
  availableHeight: number;
  open: () => void;
  close: () => void;
  markBodyReady: () => void;
  setAvailableHeight: (height: number) => void;
};

const FiltersOpenContext = createContext<FiltersOpenContextValue | null>(null);

export const FiltersOpenProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const hasFilterFacets = useSelector((state: RootState) =>
    Boolean(state.search.hotels?.filters),
  );
  const isSearchLoading = useSelector((state: RootState) => state.search.loading);
  const [visible, setVisible] = useState(false);
  const [bodyReady, setBodyReady] = useState(false);
  const [availableHeight, setAvailableHeightState] = useState(0);

  const setAvailableHeight = useCallback((height: number) => {
    setAvailableHeightState(prev =>
      Math.abs(prev - height) > 1 ? height : prev,
    );
  }, []);

  // New search / cleared facets → must remount filters before opening again.
  useEffect(() => {
    if (!hasFilterFacets) {
      setVisible(false);
      setBodyReady(false);
    }
  }, [hasFilterFacets]);

  useEffect(() => {
    if (isSearchLoading) {
      setVisible(false);
      setBodyReady(false);
    }
  }, [isSearchLoading]);

  const markBodyReady = useCallback(() => {
    setBodyReady(true);
  }, []);

  const open = useCallback(() => {
    // Only open after the full filter list is prepared — no empty shell.
    if (!bodyReady) {
      return;
    }
    setVisible(true);
  }, [bodyReady]);

  const close = useCallback(() => {
    setVisible(false);
  }, []);

  const value = useMemo(
    () => ({
      visible,
      bodyReady,
      shouldMountBody: hasFilterFacets && !isSearchLoading,
      availableHeight,
      open,
      close,
      markBodyReady,
      setAvailableHeight,
    }),
    [
      visible,
      bodyReady,
      hasFilterFacets,
      isSearchLoading,
      availableHeight,
      open,
      close,
      markBodyReady,
      setAvailableHeight,
    ],
  );

  return (
    <FiltersOpenContext.Provider value={value}>
      {children}
    </FiltersOpenContext.Provider>
  );
};

export const useFiltersOpen = (): FiltersOpenContextValue => {
  const ctx = useContext(FiltersOpenContext);
  if (!ctx) {
    throw new Error('useFiltersOpen must be used within FiltersOpenProvider');
  }
  return ctx;
};
