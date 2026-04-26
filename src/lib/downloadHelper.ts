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
      // Check and request permission first
      let permStatus = await Filesystem.checkPermissions();
      
      if (permStatus.publicStorage !== 'granted') {
        permStatus = await Filesystem.requestPermissions();
      }

      if (permStatus.publicStorage !== 'granted') {
        alert("ফাইল সেভ করার জন্য স্টোরেজ পারমিশন প্রয়োজন। দয়া করে সেটিং থেকে পারমিশন দিন।");
        return;
      }

      const base64Data = await blobToBase64(blob);
      
      // Save directly to Documents folder instead of Cache + Share (which causes crashes)
      await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Documents
      });
      
      alert(`ফাইলটি সফলভাবে ডাউনলোড হয়েছে!\nফাইলটি আপনার ফোনের 'Documents' ফোল্ডারে ${filename} নামে সেভ হয়েছে।`);
      return;
    } catch (error) {
      console.error("Native save failed:", error);
      alert("ডাউনলোড ফেইল হয়েছে। দয়া করে অ্যাপ এর স্টোরেজ পারমিশন অন আছে কিনা চেক করুন।");
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
