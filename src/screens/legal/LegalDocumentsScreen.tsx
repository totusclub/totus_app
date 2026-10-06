import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon, AppText } from '../../component/UI';
import { TabletCentered } from '../../component/UI/tablet';
import { useTheme } from '../../hooks/useTheme';
import { LEGAL_DOCS, type LegalDoc } from '../../content/legalDocs';
import LegalHeader from './LegalHeader';
import { LEGAL_DOCUMENT_ROUTE, type LegalDocumentParams } from './legalRoutes';

/**
 * «Документы» — список юридических документов ООО «ТОТУСКЛАБ».
 * Карточка со строками в стиле настроек экрана «Аккаунт»; тексты — из CMS
 * (экран документа, LegalDocumentScreen).
 */
const LegalDocumentsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const tabBarHeight = React.useContext(BottomTabBarHeightContext) ?? 0;
  const { theme } = useTheme();

  const open = (doc: LegalDoc) => {
    const params: LegalDocumentParams = { slug: doc.slug, title: doc.title };
    navigation.navigate(LEGAL_DOCUMENT_ROUTE, params);
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.backgroundSecondary, paddingTop: insets.top },
      ]}>
      <LegalHeader title="Документы" onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(tabBarHeight, insets.bottom) + 24 },
        ]}
        showsVerticalScrollIndicator={false}>
        <TabletCentered>
          <View
            style={[
              styles.card,
              { backgroundColor: theme.cardBackground, borderColor: theme.borderLight },
            ]}>
            {LEGAL_DOCS.map((doc, index) => (
              <React.Fragment key={doc.slug}>
                {index > 0 ? (
                  <View style={[styles.hairline, { backgroundColor: theme.border }]} />
                ) : null}
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => open(doc)}
                  activeOpacity={0.65}
                  accessibilityRole="button">
                  <View style={styles.textCol}>
                    <AppText style={[styles.title, { color: theme.text }]}>{doc.title}</AppText>
                    <AppText style={[styles.subtitle, { color: theme.textTertiary }]}>
                      {doc.short}
                    </AppText>
                  </View>
                  <AppIcon name="arrowRight" size={14} color={theme.textTertiary} />
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </View>
        </TabletCentered>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  // Те же размеры, что у карточек настроек на экране «Аккаунт».
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    minHeight: 48,
    gap: 10,
  },
  textCol: {
    flex: 1,
    gap: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '400',
    letterSpacing: -0.1,
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 12,
  },
});

export default LegalDocumentsScreen;
