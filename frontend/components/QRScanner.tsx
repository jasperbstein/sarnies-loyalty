'use client';

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Coffee, X, Monitor, SwitchCamera, Scan } from 'lucide-react';
import QrScanner from 'qr-scanner';

interface QRScannerProps {
  onScan: (data: string) => void;
}

export interface QRScannerRef {
  startScanner: () => void;
}

const QRScannerComponent = forwardRef<QRScannerRef, QRScannerProps>(({ onScan }, ref) => {
  const [manualInput, setManualInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [qrDetected, setQrDetected] = useState(false);
  const [cameras, setCameras] = useState<QrScanner.Camera[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const scannerRef = useRef<QrScanner | null>(null);
  const scannedRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const startScanner = async (cameraIdOverride?: string) => {
    try {
      setError('');
      scannedRef.current = false;

      // Check if we're in a browser environment with camera support
      if (typeof window === 'undefined' || !navigator?.mediaDevices?.getUserMedia) {
        throw new Error('Camera API not supported in this browser. Please use a modern browser like Chrome or Safari.');
      }

      // First, request camera permission with high resolution for better QR detection
      try {
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          }
        });
      } catch (permErr: any) {
        if (permErr.name === 'NotAllowedError' || permErr.name === 'PermissionDeniedError') {
          throw new Error('PERMISSION_DENIED');
        }
        throw permErr;
      }

      // Get available cameras
      const hasCamera = await QrScanner.hasCamera();
      if (!hasCamera) {
        throw new Error('NO_CAMERA');
      }

      const deviceList = await QrScanner.listCameras(true);
      if (!deviceList || deviceList.length === 0) {
        throw new Error('NO_CAMERA');
      }

      setCameras(deviceList);

      // Set scanning state AFTER permission granted
      setScanning(true);

      // Wait for DOM to update and React to render
      await new Promise(resolve => setTimeout(resolve, 300));

      // Check if video element exists
      if (!videoRef.current) {
        throw new Error('Video element not ready. Please try again.');
      }

      // Select camera: override > selected > back camera > first camera
      let cameraId = cameraIdOverride || selectedCamera;
      if (!cameraId) {
        // Prefer back/environment camera
        const backCamera = deviceList.find(cam =>
          cam.label.toLowerCase().includes('back') ||
          cam.label.toLowerCase().includes('rear') ||
          cam.label.toLowerCase().includes('environment')
        );
        cameraId = backCamera?.id || deviceList[deviceList.length - 1].id;
        setSelectedCamera(cameraId);
      }

      // Create scanner with optimized settings for small QR codes
      const qrScanner = new QrScanner(
        videoRef.current,
        (result) => {
          if (!scannedRef.current) {
            scannedRef.current = true;
            setQrDetected(true);
            // Keep the green square for 500ms before processing
            setTimeout(() => {
              onScan(result.data);
              stopScanner();
            }, 500);
          }
        },
        {
          returnDetailedScanResult: true,
          highlightScanRegion: false, // We use custom overlay
          highlightCodeOutline: true,
          preferredCamera: cameraId,
          // Optimizations for small QR codes on cards
          maxScansPerSecond: 15, // More frequent scanning
          calculateScanRegion: (video) => {
            // Use larger scan region for better small QR detection
            const smallestDimension = Math.min(video.videoWidth, video.videoHeight);
            const scanRegionSize = Math.round(smallestDimension * 0.9); // 90% of frame
            return {
              x: Math.round((video.videoWidth - scanRegionSize) / 2),
              y: Math.round((video.videoHeight - scanRegionSize) / 2),
              width: scanRegionSize,
              height: scanRegionSize,
            };
          },
        }
      );

      scannerRef.current = qrScanner;

      // Set camera before starting
      if (cameraId) {
        await qrScanner.setCamera(cameraId);
      }

      // Start scanning
      await qrScanner.start();

    } catch (err: any) {
      console.error('Scanner error:', err);

      let errorMsg = 'Failed to start camera.';
      const errStr = String(err);

      if (err.message === 'PERMISSION_DENIED' || errStr.includes('NotAllowed') || errStr.includes('Permission')) {
        errorMsg = 'Camera permission denied. Please allow camera access and try again.';
      } else if (err.message === 'NO_CAMERA' || errStr.includes('NotFound')) {
        errorMsg = 'No camera found on this device.';
      } else if (errStr.includes('NotReadable') || errStr.includes('in use')) {
        errorMsg = 'Camera is already in use by another app.';
      } else if (err.message && err.message !== 'PERMISSION_DENIED' && err.message !== 'NO_CAMERA') {
        errorMsg = err.message;
      }

      setError(errorMsg);
      setScanning(false);
    }
  };

  const switchCamera = async () => {
    if (cameras.length <= 1) return;

    const currentIndex = cameras.findIndex(c => c.id === selectedCamera);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamera = cameras[nextIndex];

    if (scannerRef.current) {
      try {
        await scannerRef.current.setCamera(nextCamera.id);
        setSelectedCamera(nextCamera.id);
      } catch (err) {
        console.error('Error switching camera:', err);
        // If switching fails, restart with new camera
        await stopScanner();
        await startScanner(nextCamera.id);
      }
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        scannerRef.current.stop();
        scannerRef.current.destroy();
        scannerRef.current = null;
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    setScanning(false);
    setQrDetected(false);
  };

  // Expose startScanner function to parent via ref
  useImperativeHandle(ref, () => ({
    startScanner: () => {
      if (!scanning) {
        startScanner();
      }
    }
  }));

  useEffect(() => {
    // Prevent body scroll when scanning
    if (scanning) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      if (scannerRef.current) {
        stopScanner();
      }
    };
  }, [scanning]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      onScan(manualInput.trim());
      setManualInput('');
    }
  };

  return (
    <>
      {!scanning ? (
        error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )
      ) : (
        // Fullscreen Camera View
        <div className="fixed inset-0 z-50 bg-black">
          {/* Video Element with iOS optimizations */}
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted
            style={{
              transform: 'scaleX(1)', // No mirror effect
            }}
          />

          {/* Top Bar with Controls */}
          <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-4 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coffee className="w-6 h-6 text-yellow-400" strokeWidth={2} />
                <h3 className="text-white font-bold text-lg">Scan QR Code</h3>
              </div>
              <div className="flex gap-2">
                {cameras.length > 1 && (
                  <button
                    onClick={switchCamera}
                    className="p-3 bg-white/20 backdrop-blur-sm text-white rounded-full hover:bg-white/30 transition-colors"
                    title="Switch Camera"
                  >
                    <SwitchCamera size={24} />
                  </button>
                )}
                <button
                  onClick={stopScanner}
                  className="p-3 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                  title="Close Camera"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
          </div>

          {/* Scanning Frame Overlay - Larger for small QR codes */}
          {!qrDetected && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-5">
              <div className="relative w-[85vw] max-w-[360px] aspect-square">
                {/* Corner markers with Sarnies gold color */}
                <div className="absolute -top-1 -left-1 w-12 h-12 border-l-4 border-t-4 border-yellow-400 rounded-tl-xl"></div>
                <div className="absolute -top-1 -right-1 w-12 h-12 border-r-4 border-t-4 border-yellow-400 rounded-tr-xl"></div>
                <div className="absolute -bottom-1 -left-1 w-12 h-12 border-l-4 border-b-4 border-yellow-400 rounded-bl-xl"></div>
                <div className="absolute -bottom-1 -right-1 w-12 h-12 border-r-4 border-b-4 border-yellow-400 rounded-br-xl"></div>

                {/* Scanning line animation */}
                <div className="absolute inset-x-4 top-4 h-0.5 bg-gradient-to-r from-transparent via-yellow-400 to-transparent animate-scan-line"></div>

                {/* Center coffee cup icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-black/40 backdrop-blur-sm p-3 rounded-xl">
                    <Coffee className="w-8 h-8 text-yellow-400/80" strokeWidth={2} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Status Bar */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-6 pb-8 z-10">
            {qrDetected ? (
              <div className="bg-yellow-500 text-black px-6 py-4 rounded-xl text-center font-semibold shadow-lg flex items-center justify-center gap-2">
                <Coffee className="w-5 h-5" strokeWidth={2.5} />
                <span>QR Recognized — Loading...</span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-white/15 backdrop-blur-sm text-white px-5 py-4 rounded-xl text-center">
                  <p className="font-semibold text-[15px]">Position QR code in frame</p>
                  <p className="text-sm text-white/70 mt-1.5">Move closer for small QR codes on cards</p>
                </div>
                {/* Tips for small QR codes */}
                <div className="flex justify-center gap-4 text-white/60 text-xs">
                  <span className="flex items-center gap-1.5">
                    <Scan className="w-3.5 h-3.5" />
                    10-15cm distance
                  </span>
                  <span>•</span>
                  <span>Good lighting helps</span>
                </div>
              </div>
            )}
            {cameras.length > 1 && selectedCamera && (
              <p className="text-white/50 text-xs text-center mt-3">
                {cameras.find(c => c.id === selectedCamera)?.label || 'Camera'}
              </p>
            )}
          </div>

          {/* QR Detection Success Overlay - Sarnies Theme */}
          {qrDetected && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <div className="relative w-[85vw] max-w-[360px] aspect-square">
                {/* Animated gold border with coffee theme */}
                <div
                  className="absolute inset-0 border-4 border-yellow-400 rounded-xl animate-pulse"
                  style={{
                    boxShadow: '0 0 60px rgba(250, 204, 21, 0.6)'
                  }}
                ></div>

                {/* Corner markers - Sarnies gold */}
                <div className="absolute -top-1 -left-1 w-12 h-12 border-l-4 border-t-4 border-yellow-300 rounded-tl-xl"></div>
                <div className="absolute -top-1 -right-1 w-12 h-12 border-r-4 border-t-4 border-yellow-300 rounded-tr-xl"></div>
                <div className="absolute -bottom-1 -left-1 w-12 h-12 border-l-4 border-b-4 border-yellow-300 rounded-bl-xl"></div>
                <div className="absolute -bottom-1 -right-1 w-12 h-12 border-r-4 border-b-4 border-yellow-300 rounded-br-xl"></div>

                {/* Success coffee cup with checkmark */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-yellow-500 text-black rounded-full p-5 shadow-2xl relative">
                    <Coffee className="w-12 h-12" strokeWidth={2.5} />
                    {/* Checkmark badge */}
                    <div className="absolute -bottom-1.5 -right-1.5 bg-green-500 text-white rounded-full p-1.5 shadow-lg border-[3px] border-white">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
});

QRScannerComponent.displayName = 'QRScanner';

export default QRScannerComponent;
