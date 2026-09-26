import { Platform, Linking, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

/**
 * View or share a PDF document.
 * @param doc The jsPDF instance
 * @param fileName The desired name for the PDF file
 */
export const viewOrSharePdf = async (doc: any, fileName: string) => {
  try {
    if (Platform.OS === 'web') {
      window.open(doc.output('bloburl'));
    } else {
      // Get base64 string from data URI
      const dataUri = doc.output('datauristring');
      const base64Data = dataUri.split(',')[1];
      
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
      
      // Write the file to local storage
      await FileSystem.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Check if sharing is available (it should be on Android/iOS)
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'View or Share PDF',
          UTI: 'com.adobe.pdf'
        });
      } else {
        Alert.alert('Error', 'Sharing is not available on this device');
      }
    }
  } catch (error) {
    console.error('PDF View/Share Error:', error);
    Alert.alert('Error', 'Failed to open or share PDF');
  }
};

/**
 * Share a message via WhatsApp.
 * @param phone The recipient's phone number (with country code)
 * @param message The message to send
 */
export const shareViaWhatsApp = async (phone: string, message: string) => {
  try {
    if (Platform.OS === 'web') {
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    } else {
      const url = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;
      const canOpen = await Linking.canOpenURL(url);
      
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        // Fallback to web link if WhatsApp is not installed
        Alert.alert(
          'WhatsApp Not Found',
          'WhatsApp does not seem to be installed. Do you want to try opening via web browser?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Open Web', 
              onPress: () => Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`) 
            }
          ]
        );
      }
    }
  } catch (error) {
    console.error('WhatsApp Share Error:', error);
    Alert.alert('Error', 'Failed to share on WhatsApp');
  }
};
