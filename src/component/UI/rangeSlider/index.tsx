import React, { useState } from 'react';
import { StyleSheet, View, LayoutChangeEvent } from 'react-native';
import { FontTextInput as TextInput } from '../text/FontText';
import MultiSlider from '@ptomasroos/react-native-multi-slider';
import AppText from '../text';
import { useTheme } from '../../../hooks/useTheme';
import { useLayout } from '../../../hooks/useLayout';

/** Phone track width (fixed, unchanged). */
const PHONE_TRACK_WIDTH = 311;
/** Slider marker diameter — the track must leave room for it on both ends. */
const MARKER_SIZE = 24;
/** Fallback before the first layout on iPad: window width minus sheet paddings (16 + 16) and marker room. */
const TABLET_TRACK_INSET = 64;
/** iPad, панель фильтров (compact): ширина до первого замера — колонка 280 минус отступы карточки и маркер. */
const COMPACT_FALLBACK_TRACK = 216;

type RangeSliderProps = {
  label: string;
  min: number;
  max: number;
  minValue?: number;
  maxValue?: number;
  onMinChange: (value: number) => void;
  onMaxChange: (value: number) => void;
  minPlaceholder?: string;
  maxPlaceholder?: string;
  /**
   * iPad, панель фильтров слева (макет «Выдача — вариант A», 02.11.2026): поля «от / до»
   * ниже, числа с разделителем тысяч, ползунок ровно по ширине панели (раньше он был
   * не уже 311 pt и вылезал за карточку оранжевой полосой). Телефон этот режим не включает.
   */
  compact?: boolean;
};

const THIN_SPACE = String.fromCharCode(0x202f);
const formatThousands = (value: number): string =>
  String(Math.round(Number(value) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, THIN_SPACE);
const parseDigits = (text: string): number => Number(String(text).replace(/\D/g, '')) || 0;

const RangeSlider: React.FC<RangeSliderProps> = ({
  label,
  min,
  max,
  minValue = 0,
  maxValue = 387648,
  onMinChange,
  onMaxChange,
  minPlaceholder = '0',
  maxPlaceholder = '387648',
  compact = false,
}) => {
  const { theme } = useTheme();
  const { isTablet, width: windowWidth } = useLayout();
  // iPad only: the track fills the available width (measured; window-based fallback before layout).
  const [tabletContainerWidth, setTabletContainerWidth] = useState<number | null>(null);
  const trackWidth = compact
    ? Math.max(
        120,
        tabletContainerWidth !== null ? tabletContainerWidth - MARKER_SIZE : COMPACT_FALLBACK_TRACK,
      )
    : isTablet
    ? Math.max(
        PHONE_TRACK_WIDTH,
        tabletContainerWidth !== null
          ? tabletContainerWidth - MARKER_SIZE
          : windowWidth - TABLET_TRACK_INSET,
      )
    : PHONE_TRACK_WIDTH;
  const tabletSliderContainerProps = isTablet || compact
    ? {
        onLayout: (e: LayoutChangeEvent) => {
          setTabletContainerWidth(Math.round(e.nativeEvent.layout.width));
        },
      }
    : {};
  const tabletSliderProps = isTablet || compact ? { sliderLength: trackWidth } : {};

  if (compact) {
    const inputBox = [
      styles.compactInputBox,
      { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder },
    ];
    return (
      <View style={styles.compactSection}>
        <AppText style={[styles.compactTitle, { color: theme.text }]}>{label}</AppText>
        <View style={styles.rangeInputs}>
          <View style={inputBox}>
            <AppText style={[styles.compactPrefix, { color: theme.textTertiary }]}>от</AppText>
            <TextInput
              allowFontScaling={false}
              style={[styles.compactInput, { color: theme.text }]}
              value={formatThousands(min)}
              onChangeText={(text) => {
                const numValue = parseDigits(text);
                if (numValue <= max) {
                  onMinChange(numValue);
                }
              }}
              keyboardType="numeric"
              placeholder={minPlaceholder}
              placeholderTextColor={theme.inputPlaceholder}
            />
          </View>
          <View style={inputBox}>
            <AppText style={[styles.compactPrefix, { color: theme.textTertiary }]}>до</AppText>
            <TextInput
              allowFontScaling={false}
              style={[styles.compactInput, { color: theme.text }]}
              value={formatThousands(max)}
              onChangeText={(text) => {
                const numValue = parseDigits(text);
                if (numValue >= min) {
                  onMaxChange(numValue);
                }
              }}
              keyboardType="numeric"
              placeholder={maxPlaceholder}
              placeholderTextColor={theme.inputPlaceholder}
            />
          </View>
        </View>
        <View style={styles.compactSliderContainer} {...tabletSliderContainerProps}>
          <MultiSlider
            {...tabletSliderProps}
            values={[min, max]}
            onValuesChange={(values) => {
              onMinChange(values[0]);
              onMaxChange(values[1]);
            }}
            min={minValue}
            max={maxValue}
            step={1}
            allowOverlap={false}
            snapped
            selectedStyle={[styles.multiSliderSelected, { backgroundColor: theme.brand }]}
            unselectedStyle={[styles.multiSliderUnselected, { backgroundColor: theme.borderSecondary }]}
            containerStyle={styles.compactSliderInner}
            trackStyle={[styles.multiSliderTrack, { width: trackWidth }]}
            markerStyle={[
              styles.compactMarker,
              {
                backgroundColor: theme.background,
                borderColor: theme.brand,
              },
            ]}
            pressedMarkerStyle={[
              styles.compactMarker,
              {
                backgroundColor: theme.background,
                borderColor: theme.brand,
              },
            ]}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.section, { borderBottomColor: theme.borderLight }]}>
      <AppText style={[styles.sectionTitle, { color: theme.text }]}>{label}</AppText>
      <View style={styles.rangeInputs}>
        <TextInput
            allowFontScaling={false}
          style={[
            styles.rangeInput,
            {
              backgroundColor: theme.inputBackground,
              borderColor: theme.inputBorder,
              color: theme.text,
            },
          ]}
          value={min.toString()}
          onChangeText={(text) => {
            const numValue = Number(text) || 0;
            if (numValue <= max) {
              onMinChange(numValue);
            }
          }}
          keyboardType="numeric"
          placeholder={minPlaceholder}
          placeholderTextColor={theme.inputPlaceholder}
        />
        <View style={styles.rangeInputSeparator}>
          <AppText style={[styles.rangeInputSeparatorText, { color: theme.textTertiary }]}>—</AppText>
        </View>
        <TextInput
            allowFontScaling={false}
          style={[
            styles.rangeInput,
            {
              backgroundColor: theme.inputBackground,
              borderColor: theme.inputBorder,
              color: theme.text,
            },
          ]}
          value={max.toString()}
          onChangeText={(text) => {
            const numValue = Number(text) || 0;
            if (numValue >= min) {
              onMaxChange(numValue);
            }
          }}
          keyboardType="numeric"
          placeholder={maxPlaceholder}
          placeholderTextColor={theme.inputPlaceholder}
        />
      </View>
      <View style={styles.sliderContainer} {...tabletSliderContainerProps}>
        <MultiSlider
          {...tabletSliderProps}
          values={[min, max]}
          onValuesChange={(values) => {
            onMinChange(values[0]);
            onMaxChange(values[1]);
          }}
          min={minValue}
          max={maxValue}
          step={1}
          allowOverlap={false}
          snapped
          selectedStyle={[styles.multiSliderSelected, { backgroundColor: theme.brand }]}
          unselectedStyle={[styles.multiSliderUnselected, { backgroundColor: theme.borderSecondary }]}
          containerStyle={styles.multiSliderContainer}
          trackStyle={isTablet ? [styles.multiSliderTrack, { width: trackWidth }] : styles.multiSliderTrack}
          markerStyle={[
            styles.multiSliderMarker,
            {
              backgroundColor: theme.background,
              borderColor: theme.border,
            },
          ]}
          pressedMarkerStyle={[
            styles.multiSliderMarkerPressed,
            {
              backgroundColor: theme.background,
              borderColor: theme.brand,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  rangeInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  rangeInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    paddingHorizontal: 17,
    paddingVertical: 17,
    textAlign: 'left',
    borderWidth: 1,
    borderRadius: 8,
  },
  rangeInputSeparator: {
    paddingHorizontal: 4,
  },
  rangeInputSeparatorText: {
    fontSize: 16,
    fontWeight: '400',
  },
  sliderContainer: {
    paddingHorizontal: 0,
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  multiSliderContainer: {
    height: 40,
  },
  multiSliderTrack: {
    height: 4,
    width: 311,
    borderRadius: 3,
  },
  multiSliderSelected: {
    backgroundColor: '#FE732E',
  },
  multiSliderUnselected: {
    backgroundColor: '#00000020',
  },
  multiSliderMarker: {
    width: 24,
    height: 24,
    borderRadius: 16,
    borderWidth: 2,
  },
  multiSliderMarkerPressed: {
    borderRadius: 16,
    borderWidth: 2,
  },
  compactSection: {
    gap: 12,
  },
  compactTitle: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  compactInputBox: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactPrefix: {
    fontSize: 13,
  },
  compactInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: 0,
  },
  compactSliderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -4,
  },
  compactSliderInner: {
    height: 28,
  },
  compactMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
});

export default RangeSlider;
