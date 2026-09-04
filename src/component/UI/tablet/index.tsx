import React, { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useLayout, TABLET_MAX_CONTENT_WIDTH } from '../../../hooks/useLayout';

/**
 * Tablet-only layout helpers. On iPhone every component here renders its
 * children unchanged (no wrapper view), so the phone UI stays identical.
 */

type CenteredProps = {
  children: ReactNode;
  /** Max width of the centered column on iPad. */
  maxWidth?: number;
  style?: ViewStyle;
};

/** Centers single-column content (forms, details) on iPad; passthrough on phone. */
export const TabletCentered: React.FC<CenteredProps> = ({
  children,
  maxWidth = TABLET_MAX_CONTENT_WIDTH,
  style,
}) => {
  const { isTablet } = useLayout();
  if (!isTablet) {
    return <>{children}</>;
  }
  return (
    <View style={styles.centerRow}>
      <View style={[styles.centerColumn, { maxWidth }, style]}>{children}</View>
    </View>
  );
};

type ColumnsProps = {
  /** Main (left) column. */
  children: ReactNode;
  /** Secondary (right) column; rendered only on iPad. */
  side?: ReactNode;
  sideWidth?: number;
  gap?: number;
  style?: ViewStyle;
};

/**
 * Two-column layout for iPad: `children` on the left (flex 1), `side` on the right.
 * On phone renders `children` and `side` stacked, unchanged.
 */
export const TabletColumns: React.FC<ColumnsProps> = ({
  children,
  side,
  sideWidth = 340,
  gap = 20,
  style,
}) => {
  const { isTablet } = useLayout();
  if (!isTablet) {
    return (
      <>
        {children}
        {side}
      </>
    );
  }
  return (
    <View style={[styles.columnsRow, { gap }, style]}>
      <View style={styles.mainColumn}>{children}</View>
      {side ? <View style={{ width: sideWidth }}>{side}</View> : null}
    </View>
  );
};

/**
 * Splits `items` into rows of `columns` and renders them as a grid.
 * With `columns === 1` (phone) renders the items in a plain column, unchanged.
 */
export function TabletGrid<T>({
  items,
  columns,
  renderItem,
  keyExtractor,
  gap = 16,
  rowStyle,
}: {
  items: T[];
  columns: number;
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T, index: number) => string;
  gap?: number;
  rowStyle?: ViewStyle;
}) {
  if (columns <= 1) {
    return <>{items.map((item, index) => renderItem(item, index))}</>;
  }
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += columns) {
    rows.push(items.slice(i, i + columns));
  }
  return (
    <>
      {rows.map((row, rowIndex) => (
        <View
          key={`row-${rowIndex}-${keyExtractor(row[0], rowIndex * columns)}`}
          style={[styles.gridRow, { gap }, rowStyle]}>
          {row.map((item, i) => (
            <View key={keyExtractor(item, rowIndex * columns + i)} style={styles.gridCell}>
              {renderItem(item, rowIndex * columns + i)}
            </View>
          ))}
          {row.length < columns
            ? Array.from({ length: columns - row.length }).map((_, i) => (
                <View key={`spacer-${rowIndex}-${i}`} style={styles.gridCell} />
              ))
            : null}
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  centerRow: {
    width: '100%',
    alignItems: 'center',
  },
  centerColumn: {
    width: '100%',
  },
  columnsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  mainColumn: {
    flex: 1,
    minWidth: 0,
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  gridCell: {
    flex: 1,
    minWidth: 0,
  },
});
