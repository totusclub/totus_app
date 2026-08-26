import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  View,
  TouchableOpacity,
  Platform,
  ScrollView,
  Pressable,
} from 'react-native';
import Modal from 'react-native-modal';
import { BlurView } from '@react-native-community/blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, AppIcon } from '../../UI';
import { getDocumentName } from '../../../utils/ordersUtils';
import { downloadOrderDocumentWithFeedback } from '../../../utils/downloadOrderDocument';
import { useTheme } from '../../../hooks/useTheme';
import DocumentPdfViewer from './DocumentPdfViewer';

export type OrderDocumentItem = {
  name: string;
  url: string;
};

type DocumentsModalProps = {
  visible: boolean;
  onClose: () => void;
  documents: OrderDocumentItem[];
};

const DocumentsModal: React.FC<DocumentsModalProps> = ({
  visible,
  onClose,
  documents,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [viewerDoc, setViewerDoc] = useState<OrderDocumentItem | null>(null);

  useEffect(() => {
    if (!visible) setViewerDoc(null);
  }, [visible]);

  const [downloadingUrl, setDownloadingUrl] = useState<string | null>(null);

  const handleOpen = useCallback((doc: OrderDocumentItem) => {
    setViewerDoc(doc);
  }, []);

  const handleDownload = useCallback(async (doc: OrderDocumentItem) => {
    setDownloadingUrl(doc.url);
    try {
      await downloadOrderDocumentWithFeedback(doc.url, doc.name);
    } finally {
      setDownloadingUrl(null);
    }
  }, []);

  const handleCloseModal = useCallback(() => {
    if (viewerDoc) {
      setViewerDoc(null);
      return;
    }
    onClose();
  }, [onClose, viewerDoc]);

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={handleCloseModal}
      onBackButtonPress={handleCloseModal}
      style={styles.modal}
      backdropOpacity={0}
      hasBackdrop={false}
      animationIn="fadeIn"
      animationOut="fadeOut"
      propagateSwipe={true}
      avoidKeyboard={false}>
      {Platform.OS === 'ios' ? (
        <BlurView
          style={styles.blurOverlay}
          blurType={theme.mode === 'dark' ? 'dark' : 'light'}
          blurAmount={10}
        />
      ) : (
        <View
          style={[
            styles.blurOverlay,
            styles.blurOverlayAndroid,
            { backgroundColor: theme.overlay },
          ]}
        />
      )}
      <View
        style={[
          styles.modalContent,
          {
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom,
            backgroundColor: theme.background,
          },
        ]}>
        <View style={styles.header}>
          <AppText style={[styles.headerTitle, { color: theme.text }]}>
            Документы по туру
          </AppText>
          <TouchableOpacity
            onPress={handleCloseModal}
            style={styles.closeButton}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
            <AppText style={[styles.closeText, { color: theme.text }]}>✕</AppText>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <View
            style={[
              styles.documentsCard,
              { backgroundColor: theme.backgroundTertiary },
            ]}>
            {documents.length === 0 ? (
              <View style={styles.emptyDocuments}>
                <AppText
                  style={[
                    styles.emptyDocumentsText,
                    { color: theme.textTertiary },
                  ]}>
                  Документы пока недоступны
                </AppText>
              </View>
            ) : (
              documents.map((doc, index) => (
                <React.Fragment key={`${doc.url}-${index}`}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.documentRow,
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={() => handleOpen(doc)}>
                    <View style={styles.documentIcon}>
                      <AppIcon name="file" size={24} color={theme.text} />
                    </View>
                    <AppText
                      style={[styles.documentName, { color: theme.text }]}
                      numberOfLines={1}>
                      {doc.name || getDocumentName(doc.url)}
                    </AppText>
                    <Pressable
                      onPress={() => handleDownload(doc)}
                      disabled={downloadingUrl === doc.url}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      style={({ pressed }) => [
                        styles.downloadButton,
                        pressed && { opacity: 0.6 },
                      ]}>
                      {downloadingUrl === doc.url ? (
                        <ActivityIndicator size="small" color={theme.brand} />
                      ) : (
                        <AppIcon name="download" size={22} color={theme.text} />
                      )}
                    </Pressable>
                  </Pressable>
                  {index < documents.length - 1 && (
                    <View
                      style={[
                        styles.divider,
                        { backgroundColor: theme.divider },
                      ]}
                    />
                  )}
                </React.Fragment>
              ))
            )}
          </View>
        </ScrollView>
      </View>

      <DocumentPdfViewer
        visible={Boolean(viewerDoc)}
        title={viewerDoc?.name}
        url={viewerDoc?.url ?? null}
        onClose={() => setViewerDoc(null)}
      />
    </Modal>
  );
};

export default DocumentsModal;

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    flex: 1,
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  blurOverlayAndroid: {},
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    position: 'absolute',
    right: 0,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 24,
    fontWeight: '300',
  },
  documentsCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  emptyDocuments: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  emptyDocumentsText: {
    fontSize: 15,
    textAlign: 'center',
  },
  documentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  documentIcon: {
    marginRight: 12,
  },
  documentName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  downloadButton: {
    marginLeft: 12,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    marginLeft: 52,
  },
});
