import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result.split(',')[1]);
      } else {
        reject(new Error('Could not convert blob to base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const downloadOrShareFile = async (blob: Blob, filename: string, mimeType: string) => {
  // 1. Capacitor Native App (Android/iOS) Fallback using Filesystem API
  if (Capacitor.isNativePlatform()) {
    try {
      const base64Data = await blobToBase64(blob);
      
      // Fix: Write file in chunks to avoid TransactionTooLargeException causing immediate crash
      await Filesystem.writeFile({
        path: filename,
        data: '',
        directory: Directory.Cache
      });
      
      // Use chunks of multiple of 4 to ensure valid base64 blocks (512KB of characters)
      const chunkSize = 512 * 1024;
      for (let i = 0; i < base64Data.length; i += chunkSize) {
        const chunk = base64Data.slice(i, i + chunkSize);
        await Filesystem.appendFile({
          path: filename,
          data: chunk,
          directory: Directory.Cache
        });
      }

      // Get URI of saved file
      const savedFile = await Filesystem.getUri({
        path: filename,
        directory: Directory.Cache
      });
      
      // Open native share/save dialog
      await Share.share({
        title: filename,
        url: savedFile.uri,
        dialogTitle: 'Share or Save File'
      });
      return;
    } catch (error) {
      console.error("Native save/share failed:", error);
      alert("মোবাইল অ্যাপে ফাইল সেভ বা শেয়ার করতে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।");
      return;
    }
  }

  // 2. Web / PWA Fallback
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  if (isMobile) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const dataUrl = e.target?.result as string;
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };
    reader.readAsDataURL(blob);
    return;
  }

  // Standard Blob Download for Desktop
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();

  // Cleanup
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 500);
};
