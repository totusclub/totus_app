import React, { Children, ReactNode } from 'react';
import { Text } from 'react-native';
import type { AppSymbols } from '../../../theme/fonts';

/**
 * Знаки, которых нет в Museo / Forum (₽, стрелки, неразрывный дефис…), набираются «Totus Symbols»
 * во вложенном Text — как unicode-range на сайте. Цвет, кегль, разрядку вложенный Text наследует.
 * Текст без таких знаков возвращается как был (те же объекты, без лишних элементов).
 */
const SPAN_STYLE_CACHE = new Map<string, { fontFamily: string; fontWeight: 'normal' }>();
const spanStyle = (family: string) => {
  let st = SPAN_STYLE_CACHE.get(family);
  if (!st) {
    st = { fontFamily: family, fontWeight: 'normal' };
    SPAN_STYLE_CACHE.set(family, st);
  }
  return st;
};

const hasSymbols = (value: string, pattern: RegExp) => {
  pattern.lastIndex = 0;
  const found = pattern.test(value);
  pattern.lastIndex = 0;
  return found;
};

function splitString(value: string, symbols: NonNullable<AppSymbols>, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = new RegExp(symbols.pattern.source, 'g');
  let last = 0;
  let n = 0;
  for (let m = re.exec(value); m; m = re.exec(value)) {
    if (m.index > last) out.push(value.slice(last, m.index));
    out.push(
      <Text key={`${key}s${n++}`} style={spanStyle(symbols.family)}>
        {m[0]}
      </Text>,
    );
    last = m.index + m[0].length;
  }
  if (last < value.length) out.push(value.slice(last));
  return out;
}

export function withSymbolRuns(children: ReactNode, symbols: AppSymbols): ReactNode {
  if (!symbols || children === null || children === undefined || typeof children === 'boolean') return children;
  if (typeof children === 'string') {
    return hasSymbols(children, symbols.pattern) ? splitString(children, symbols, 't') : children;
  }
  if (!Array.isArray(children)) return children;
  // массив детей: меняем, только если в строках есть такие знаки (иначе — как было)
  const flat = Children.toArray(children);
  if (!flat.some((c) => typeof c === 'string' && hasSymbols(c, symbols.pattern))) return children;
  return flat.flatMap((c, i) =>
    typeof c === 'string' && hasSymbols(c, symbols.pattern) ? splitString(c, symbols, `t${i}`) : [c],
  );
}
