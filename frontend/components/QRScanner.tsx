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

      // First, request camera permission explicitly
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
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

      // Create scanner with iOS-optimized settings
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
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: cameraId,
          // iOS Safari specific optimizations
          maxScansPerSecond: 10,
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

          {/* Scanning Frame Overlay */}
          {!qrDetected && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-5">
              <div className="relative w-72 h-72">
                {/* Corner markers with Sarnies gold color */}
                <div className="absolute -top-2 -left-2 w-16 h-16 border-l-4 border-t-4 border-yellow-400 rounded-tl-2xl"></div>
                <div className="absolute -top-2 -right-2 w-16 h-16 border-r-4 border-t-4 border-yellow-400 rounded-tr-2xl"></div>
                <div className="absolute -bottom-2 -left-2 w-16 h-16 border-l-4 border-b-4 border-yellow-400 rounded-bl-2xl"></div>
                <div className="absolute -bottom-2 -right-2 w-16 h-16 border-r-4 border-b-4 border-yellow-400 rounded-br-2xl"></div>

                {/* Center coffee cup icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-black/50 backdrop-blur-sm p-4 rounded-2xl">
                    <Coffee className="w-12 h-12 text-yellow-400 animate-pulse" strokeWidth={2} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Status Bar */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 z-10">
            {qrDetected ? (
              <div className="bg-yellow-500 text-black px-6 py-4 rounded-xl text-center font-semibold shadow-lg flex items-center justify-center gap-2">
                <Coffee className="w-5 h-5" strokeWidth={2.5} />
                <span>QR Recognized — Loading...</span>
              </div>
            ) : (
              <div className="bg-white/20 backdrop-blur-sm text-white px-6 py-4 rounded-xl text-center">
                <p className="font-medium">Hold QR code steady inside the frame</p>
                <p className="text-sm text-white/80 mt-1">Position 15-20cm from camera</p>
              </div>
            )}
            {cameras.length > 1 && selectedCamera && (
              <p className="text-white/60 text-xs text-center mt-3">
                Current: {cameras.find(c => c.id === selectedCamera)?.label || 'Unknown Camera'}
              </p>
            )}
          </div>

          {/* QR Detection Success Overlay - Sarnies Theme */}
          {qrDetected && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <div className="relative w-80 h-80">
                {/* Animated gold border with coffee theme */}
                <div
                  className="absolute inset-0 border-4 border-yellow-400 rounded-2xl animate-pulse"
                  style={{
                    boxShadow: '0 0 40px rgba(250, 204, 21, 0.8)'
                  }}
                ></div>

                {/* Corner markers - Sarnies gold */}
                <div className="absolute -top-2 -left-2 w-16 h-16 border-l-4 border-t-4 border-yellow-300 rounded-tl-2xl"></div>
                <div className="absolute -top-2 -right-2 w-16 h-16 border-r-4 border-t-4 border-yellow-300 rounded-tr-2xl"></div>
                <div className="absolute -bottom-2 -left-2 w-16 h-16 border-l-4 border-b-4 border-yellow-300 rounded-bl-2xl"></div>
                <div className="absolute -bottom-2 -right-2 w-16 h-16 border-r-4 border-b-4 border-yellow-300 rounded-br-2xl"></div>

                {/* Success coffee cup with checkmark */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-yellow-500 text-black rounded-full p-6 shadow-2xl relative">
                    <Coffee className="w-16 h-16" strokeWidth={2.5} />
                    {/* Checkmark badge */}
                    <div className="absolute -bottom-2 -right-2 bg-green-500 text-white rounded-full p-2 shadow-lg border-4 border-white">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
