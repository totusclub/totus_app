import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon, AppText } from '../../component/UI';
import { useTheme } from '../../hooks/useTheme';
import {
  PRIVACY_POLICY_SECTIONS,
  type PrivacyPolicyBlock,
} from '../../content/privacyPolicy';

const renderBlocks = (
  blocks: PrivacyPolicyBlock[],
  styles: ReturnType<typeof createStyles>,
) =>
  blocks.map((block, index) => {
    if (block.type === 'paragraph') {
      return (
        <AppText key={`p-${index}`} style={styles.paragraph}>
          {block.text}
        </AppText>
      );
    }
    return (
      <View key={`l-${index}`} style={styles.list}>
        {block.items.map((item, itemIndex) => (
          <View key={itemIndex} style={styles.listItem}>
            <AppText style={styles.bullet}>•</AppText>
            <AppText style={styles.listItemText}>{item}</AppText>
          </View>
        ))}
      </View>
    );
  });

const PrivacyPolicyScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.backgroundSecondary, paddingTop: insets.top },
      ]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
          <AppIcon name="simpleArrow" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text allowFontScaling={false} style={[styles.headerTitle, { color: theme.text }]}>
          Политика конфиденциальности
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}>
        <AppText style={styles.intro}>
          Политика обработки персональных данных Totus Club
        </AppText>

        {PRIVACY_POLICY_SECTIONS.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <AppText style={styles.sectionTitle}>{section.title}</AppText>
            {renderBlocks(section.blocks, styles)}
            {section.subsections?.map((subsection, subIndex) => (
              <View key={subIndex} style={styles.subsection}>
                <AppText style={styles.subsectionTitle}>{subsection.title}</AppText>
                {renderBlocks(subsection.blocks, styles)}
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    backButton: {
      width: 40,
      alignItems: 'flex-start',
    },
    headerTitle: {
      flex: 1,
      fontSize: 17,
      fontWeight: '600',
      textAlign: 'center',
    },
    placeholder: {
      width: 40,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      gap: 20,
    },
    intro: {
      fontSize: 15,
      fontWeight: '500',
      color: theme.textTertiary,
      lineHeight: 22,
    },
    section: {
      gap: 10,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: theme.text,
      lineHeight: 24,
    },
    subsection: {
      gap: 8,
      marginTop: 4,
    },
    subsectionTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
      lineHeight: 22,
    },
    paragraph: {
      fontSize: 15,
      fontWeight: '400',
      color: theme.textSecondary,
      lineHeight: 22,
    },
    list: {
      gap: 10,
    },
    listItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    bullet: {
      fontSize: 15,
      lineHeight: 22,
      color: theme.textSecondary,
    },
    listItemText: {
      flex: 1,
      fontSize: 15,
      fontWeight: '400',
      color: theme.textSecondary,
      lineHeight: 22,
    },
  });

export default PrivacyPolicyScreen;
