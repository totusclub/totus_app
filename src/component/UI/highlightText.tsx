import React from 'react';
import { TextStyle } from 'react-native';
import { FontText as Text } from './text/FontText';
import AppText from './text';

/**
 * Highlights the first occurrence of the query in the text.
 */
export const highlightText = (
  text: string,
  query: string,
  highlightStyle?: TextStyle,
  normalStyle?: TextStyle,
): React.ReactElement => {
  if (!query.trim()) {
    return <AppText style={normalStyle}>{text}</AppText>;
  }

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);

  if (index === -1) {
    return <AppText style={normalStyle}>{text}</AppText>;
  }

  const beforeMatch = text.substring(0, index);
  const match = text.substring(index, index + query.length);
  const afterMatch = text.substring(index + query.length);

  return (
    <AppText style={normalStyle}>
      {beforeMatch}
      <AppText style={highlightStyle}>{match}</AppText>
      {afterMatch}
    </AppText>
  );
};

/**
 * Highlights all occurrences of the query in the text.
 */
export const highlightAllMatches = (
  text: string,
  query: string,
  highlightStyle?: TextStyle,
  normalStyle?: TextStyle,
): React.ReactElement => {
  if (!query.trim()) {
    return <AppText style={normalStyle}>{text}</AppText>;
  }

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const parts: Array<{ text: string; isMatch: boolean }> = [];
  let searchIndex = 0;

  while (searchIndex < text.length) {
    const index = lowerText.indexOf(lowerQuery, searchIndex);
    if (index === -1) {
      if (searchIndex < text.length) {
        parts.push({ text: text.substring(searchIndex), isMatch: false });
      }
      break;
    }

    if (index > searchIndex) {
      parts.push({ text: text.substring(searchIndex, index), isMatch: false });
    }

    parts.push({
      text: text.substring(index, index + query.length),
      isMatch: true,
    });

    searchIndex = index + query.length;
  }

  if (parts.length === 0) {
    return <AppText style={normalStyle}>{text}</AppText>;
  }

  return (
    <AppText style={normalStyle}>
      {parts.map((part, idx) => (
        <AppText key={idx} style={part.isMatch ? highlightStyle : normalStyle}>
          {part.text}
        </AppText>
      ))}
    </AppText>
  );
};


