import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import AppText from '../text';
import { useTheme } from '../../../hooks/useTheme';
import TotusIconByKey from '../icons/totus/TotusIconByKey';
import type { TotusIconKey } from '../icons/totus/registry.generated';

type ChipOption<T = string | number> = {
  label: string;
  value: T;
  meta?: string;
  disabled?: boolean;
  /** Иконка варианта (набор Totus) — питание, тип размещения, пляж… */
  icon?: TotusIconKey | null;
};

type ChipsProps<T = string | number> = {
  options: string[] | ChipOption<T>[];
  selected: T[];
  onToggle: (option: T) => void;
};

const Chips = <T extends string | number = string | number>({
  options,
  selected,
  onToggle,
}: ChipsProps<T>) => {
  const { theme } = useTheme();
  return (
    <View style={styles.chipsContainer}>
      {options.map(option => {
        const optionValue =
          typeof option === 'string' ? (option as T) : (option.value as T);
        const optionLabel = typeof option === 'string' ? option : option.label;
        const optionMeta = typeof option === 'string' ? undefined : option.meta;
        const optionIcon = typeof option === 'string' ? undefined : option.icon;
        const disabled =
          typeof option === 'string' ? false : Boolean(option.disabled);
        const isSelected = selected.some(
          item => String(item) === String(optionValue),
        );

        return (
          <TouchableOpacity
            activeOpacity={1}
            key={String(optionValue)}
            disabled={disabled}
            style={[
              styles.chip,
              {
                backgroundColor: theme.backgroundTertiary,
                borderColor: theme.border,
                opacity: disabled ? 0.4 : 1,
              },
              isSelected && {
                backgroundColor: theme.brand,
                borderColor: theme.brand,
              },
            ]}
            onPress={() => {
              if (!disabled) onToggle(optionValue);
            }}>
            <View style={styles.chipLabelRow}>
              {optionIcon ? (
                <TotusIconByKey
                  name={optionIcon}
                  size={16}
                  color={isSelected ? '#FFFFFF' : theme.text}
                  accent={!isSelected}
                />
              ) : null}
              <AppText
                style={[
                  styles.chipText,
                  { color: theme.text },
                  ...(isSelected ? [styles.chipTextSelected] : []),
                ]}>
                {optionLabel}
              </AppText>
            </View>
            {optionMeta ? (
              <AppText
                style={[
                  styles.chipMeta,
                  {
                    color: isSelected
                      ? 'rgba(255,255,255,0.88)'
                      : theme.textTertiary,
                  },
                ]}>
                {optionMeta}
              </AppText>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    maxWidth: '100%',
    alignItems: 'flex-start',
  },
  chipLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  chipMeta: {
    fontSize: 11,
    fontWeight: '400',
    lineHeight: 14,
    marginTop: 2,
  },
});

export default Chips;
export type { ChipOption };
