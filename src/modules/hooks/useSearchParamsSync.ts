import { useEffect } from 'react';
import { convertISOToDisplay } from '../../component/home/searchSection/utils/searchHelpers';
import type { SearchParams } from '../../types/search';

export type SearchParamsState = {
  departureDate: string; // Display format: "DD.MM.YY"
  nights: number;
  adults: number;
  kids: number;
  kidsAges: number[];
};

type UseSearchParamsSyncParams = {
  sourceParams: SearchParams | null | undefined;
  params: SearchParamsState;
  setParams: React.Dispatch<React.SetStateAction<SearchParamsState>>;
};

/**
 * Hook to sync local search params state with source params (from route or Redux)
 * Updates local state when source params change externally
 */
export const useSearchParamsSync = ({
  sourceParams,
  params,
  setParams,
}: UseSearchParamsSyncParams) => {
  useEffect(() => {
    if (!sourceParams) {
      return;
    }

    const displayDate = sourceParams.start_date
      ? convertISOToDisplay(sourceParams.start_date)
      : null;
    const nightsValue = sourceParams.nights
      ? parseInt(String(sourceParams.nights).replace(/[^0-9]/g, ''), 10) || 7
      : null;
    const adultsValue = sourceParams.adults
      ? parseInt(sourceParams.adults, 10)
      : null;
    const kidsValue = sourceParams.kids
      ? parseInt(sourceParams.kids, 10)
      : null;
    const kidsAgesValue = sourceParams.kids_ages || null;

    setParams(prev => {
      const updates: Partial<SearchParamsState> = {};
      let hasChanges = false;

      if (displayDate && prev.departureDate !== displayDate) {
        updates.departureDate = displayDate;
        hasChanges = true;
      }
      if (nightsValue !== null && prev.nights !== nightsValue) {
        updates.nights = nightsValue;
        hasChanges = true;
      }
      if (adultsValue !== null && prev.adults !== adultsValue) {
        updates.adults = adultsValue;
        hasChanges = true;
      }
      if (kidsValue !== null && prev.kids !== kidsValue) {
        updates.kids = kidsValue;
        hasChanges = true;
      }
      if (kidsAgesValue !== null && JSON.stringify(prev.kidsAges) !== JSON.stringify(kidsAgesValue)) {
        updates.kidsAges = kidsAgesValue;
        hasChanges = true;
      }

      return hasChanges ? { ...prev, ...updates } : prev;
    });
  }, [
    sourceParams?.start_date,
    sourceParams?.nights,
    sourceParams?.adults,
    sourceParams?.kids,
    sourceParams?.kids_ages,
    setParams,
  ]);
};

