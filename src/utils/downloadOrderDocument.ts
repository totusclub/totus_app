import { Alert, Platform, Share } from 'react-native';
import RNFS from 'react-native-fs';

/** Strip characters that break file systems, keep readable Russian names. */
function sanitizeFileName(name: string): string {
  const cleaned = String(name || '')
    .trim()
    .replace(/[/\\?%*:|"<>]/g, '_')
    .replace(/\s+/g, ' ');
  const withExt = /\.pdf$/i.test(cleaned) ? cleaned : `${cleaned || 'Документ'}.pdf`;
  return withExt.slice(0, 120);
}

/** Avoid overwriting an existing file: «Ваучер.pdf» → «Ваучер (1).pdf». */
async function resolveUniquePath(dir: string, fileName: string): Promise<string> {
  const dotIndex = fileName.lastIndexOf('.');
  const base = dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
  const ext = dotIndex > 0 ? fileName.slice(dotIndex) : '';

  let candidate = `${dir}/${fileName}`;
  let counter = 1;

  while (await RNFS.exists(candidate)) {
    candidate = `${dir}/${base} (${counter})${ext}`;
    counter += 1;
    if (counter > 50) break;
  }

  return candidate;
}

export type DownloadDocumentResult =
  | { status: 'saved'; path: string }
  | { status: 'shared' }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

/**
 * Save an order document to the device.
 * Android → public Downloads folder. iOS → share sheet («Сохранить в Файлы»).
 */
export async function downloadOrderDocument(
  url: string,
  name?: string,
): Promise<DownloadDocumentResult> {
  if (!url) return { status: 'error', message: 'Пустая ссылка на документ' };

  const fileName = sanitizeFileName(name || 'Документ.pdf');

  try {
    const targetDir =
      Platform.OS === 'android'
        ? RNFS.DownloadDirectoryPath
        : RNFS.DocumentDirectoryPath;

    const destination = await resolveUniquePath(targetDir, fileName);

    const download = await RNFS.downloadFile({
      fromUrl: url,
      toFile: destination,
    }).promise;

    if (download.statusCode != null && download.statusCode >= 400) {
      throw new Error(`HTTP ${download.statusCode}`);
    }

    const stat = await RNFS.stat(destination).catch(() => null);
    if (!stat || Number(stat.size) <= 0) {
      throw new Error('Пустой файл');
    }

    if (Platform.OS === 'android') {
      return { status: 'saved', path: destination };
    }

    // iOS has no user-visible Downloads folder — offer the share sheet.
    const result = await Share.share({
      url: `file://${destination}`,
      title: fileName,
    });

    if (result.action === Share.dismissedAction) {
      return { status: 'cancelled' };
    }
    return { status: 'shared' };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[downloadOrderDocument] failed:', url, message);
    return { status: 'error', message };
  }
}

/** Download + user feedback, shared by the documents list and PDF viewer. */
export async function downloadOrderDocumentWithFeedback(
  url: string,
  name?: string,
): Promise<void> {
  const result = await downloadOrderDocument(url, name);

  if (result.status === 'saved') {
    Alert.alert('Документ сохранён', `Файл загружен в «Загрузки».`);
    return;
  }

  if (result.status === 'error') {
    Alert.alert(
      'Не удалось скачать',
      'Проверьте подключение к интернету и попробуйте ещё раз.',
    );
  }
}
