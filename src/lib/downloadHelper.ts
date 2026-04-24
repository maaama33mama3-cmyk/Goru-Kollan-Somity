export const downloadOrShareFile = async (blob: Blob, filename: string, mimeType: string) => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  const url = URL.createObjectURL(blob);

  // Fallback anchor function
  const fallbackDownload = () => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);
  };

  // Try Web Share API (often works on Mobile PWAs and WebViews)
  if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], filename, { type: mimeType })] })) {
    try {
      const file = new File([blob], filename, { type: mimeType });
      await navigator.share({
        files: [file],
        title: filename,
      });
      return; // Share successful
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Error sharing file:', error);
        // If it's NotAllowedError (gesture lost), we still proceed to fallback
      } else {
        return; // User cancelled
      }
    }
  }

  // If share not supported or failed, try standard download
  if (isIOS) {
    // iOS Standalone PWA blocks a.download from blob URLs. 
    // Best effort: open in new tab (might be blocked by popup blocker, but worth trying)
    // Or FileReader to data URI
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
  } else {
    fallbackDownload();
  }
};
