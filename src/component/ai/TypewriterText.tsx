import React, { useEffect, useRef, useState } from 'react';
import { TextProps } from 'react-native';
import { FontText as Text } from '../UI/text/FontText';

type TypewriterTextProps = TextProps & {
  text?: string;
  children?: React.ReactNode;
  animate?: boolean;
  onProgress?: () => void;
  onComplete?: () => void;
  msPerChar?: number;
};

const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  children,
  animate = false,
  onProgress,
  onComplete,
  msPerChar = 14,
  ...rest
}) => {
  const fullText =
    text ?? (typeof children === 'string' ? children : '') ?? '';
  const [visibleCount, setVisibleCount] = useState(
    animate ? 0 : fullText.length,
  );
  const onProgressRef = useRef(onProgress);
  const onCompleteRef = useRef(onComplete);
  onProgressRef.current = onProgress;
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!animate) {
      setVisibleCount(fullText.length);
      return;
    }

    setVisibleCount(0);
    if (!fullText) {
      onCompleteRef.current?.();
      return;
    }

    let index = 0;
    const step =
      fullText.length > 500 ? 5 : fullText.length > 250 ? 3 : fullText.length > 120 ? 2 : 1;

    const id = setInterval(() => {
      index = Math.min(fullText.length, index + step);
      setVisibleCount(index);
      onProgressRef.current?.();
      if (index >= fullText.length) {
        clearInterval(id);
        onCompleteRef.current?.();
      }
    }, msPerChar);

    return () => clearInterval(id);
  }, [animate, fullText, msPerChar]);

  return <Text {...rest}>{fullText.slice(0, visibleCount)}</Text>;
};

export default TypewriterText;
