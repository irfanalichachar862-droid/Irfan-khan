import React, { useRef, useState } from 'react';
import {
  Camera,
  Check,
  Download,
  MapPin,
  Plus,
  Printer,
  QrCode,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import jsQR from 'jsqr';
import { RegisteredTag, computeTagHash } from '../utils/antiCheatRules';
import {
  downloadTagAsPng,
  downloadTagAsSvg,
  generateBarcodeSvg,
  generateQrSvg,
} from '../utils/qrGenerator';

interface TagManagerModalProps {
  tags: RegisteredTag[];
  onAddTag: (tag: RegisteredTag) => void;
  onDeleteTag: (tagId: string) => void;
  onClose: () => void;
}

export const TagManagerModal: React.FC<TagManagerModalProps> = ({
  tags,
  onAddTag,
  onDeleteTag,
  onClose,
}) => {
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [selectedTagToView, setSelectedTagToView] = useState<RegisteredTag | null>(null);

  const [name, setName] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [codeValue, setCodeValue] = useState<string>('');
  const [codeFormat, setCodeFormat] = useState<RegisteredTag['codeFormat']>('QR_CODE');
  const [isCameraScanning, setIsCameraScanning] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startScanner = async () => {
    setIsCameraScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();

        const scanLoop = () => {
          if (
            videoRef.current &&
            videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA
          ) {
            const canvas = canvasRef.current;
            if (canvas) {
              canvas.width = videoRef.current.videoWidth;
              canvas.height = videoRef.current.videoHeight;
              const ctx = canvas.getContext('2d', { willReadFrequently: true });
              if (ctx) {
                ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imgData.data, imgData.width, imgData.height);
                if (code && code.data) {
                  setCodeValue(code.data);
                  setCodeFormat('QR_CODE');
                  stopScanner();
                  return;
                }
              }
            }
          }
          animFrameRef.current = requestAnimationFrame(scanLoop);
        };
        animFrameRef.current = requestAnimationFrame(scanLoop);
      }
    } catch (e) {
      console.warn('Scanner error', e);
      setIsCameraScanning(false);
    }
  };

  const stopScanner = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setIsCameraScanning(false);
  };

  const handleSaveNewTag = () => {
    if (!name.trim() || !codeValue.trim()) return;

    const newTag: RegisteredTag = {
      id: `tag_${Date.now()}`,
      name: name.trim(),
      location: location.trim() || 'Household Item',
      codeValue: codeValue.trim(),
      codeFormat,
      codeHash: computeTagHash(codeValue.trim()),
      createdAt: Date.now(),
    };

    onAddTag(newTag);
    stopScanner();
    setIsRegistering(false);
    setName('');
    setLocation('');
    setCodeValue('');
  };

  const handleAutoGenerateCode = () => {
    const prefix = name.trim()
      ? name
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '')
          .slice(0, 8)
      : 'SCANWAKE';
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    setCodeValue(`${prefix}-${randomSuffix}`);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tag-manager-title"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto no-scrollbar"
    >
      <div
        style={{ backgroundColor: 'var(--sw-surface)', borderColor: 'var(--sw-primary)' }}
        className="border rounded-2xl max-w-xl w-full p-4 sm:p-6 text-white shadow-2xl relative my-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-800">
          <div className="flex items-center space-x-2.5">
            <div
              style={{
                backgroundColor: 'color-mix(in srgb, var(--sw-primary) 15%, transparent)',
                color: 'var(--sw-primary)',
                borderColor: 'color-mix(in srgb, var(--sw-primary) 40%, transparent)',
              }}
              className="p-2 rounded-xl border"
            >
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 id="tag-manager-title" className="text-base sm:text-lg font-bold text-white">
                Physical Tag Registry
              </h2>
              <p className="text-xs text-gray-400">
                Register or download printable QR codes for your rooms
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            aria-label="Close Tag Registry"
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar */}
        <div className="py-3.5 flex items-center justify-between">
          <span className="text-xs text-gray-400">{tags.length} registered tags</span>
          {!isRegistering && (
            <button
              onClick={() => setIsRegistering(true)}
              style={{ backgroundColor: 'var(--sw-primary)', color: 'var(--sw-bg)' }}
              className="py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 hover:opacity-90"
            >
              <Plus className="w-4 h-4" />
              <span>Register New Tag</span>
            </button>
          )}
        </div>

        {/* Register Tag Form */}
        {isRegistering && (
          <div
            style={{ backgroundColor: 'var(--sw-bg)', borderColor: 'var(--sw-primary)' }}
            className="mb-5 p-4 rounded-xl border"
          >
            <div className="flex items-center justify-between mb-3">
              <h4
                style={{ color: 'var(--sw-primary)' }}
                className="text-sm font-bold flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                <span>Register Everyday Item</span>
              </h4>
              <button
                onClick={() => {
                  stopScanner();
                  setIsRegistering(false);
                }}
                className="text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-300 uppercase mb-1">
                  Tag Name / Item
                </label>
                <input
                  type="text"
                  placeholder="e.g. Toothpaste Tube, Coffee Can, Balcony Planter"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ backgroundColor: 'var(--sw-surface)' }}
                  className="w-full border border-gray-700 focus:border-[var(--sw-primary)] rounded-lg py-2 px-3 text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-300 uppercase mb-1">
                  Location in Home
                </label>
                <input
                  type="text"
                  placeholder="e.g. Master Bathroom, Kitchen Pantry, 2nd Floor Study"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  style={{ backgroundColor: 'var(--sw-surface)' }}
                  className="w-full border border-gray-700 focus:border-[var(--sw-primary)] rounded-lg py-2 px-3 text-xs text-white outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-gray-300 uppercase">
                    Barcode / QR Value
                  </label>
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={handleAutoGenerateCode}
                      style={{ color: 'var(--sw-accent)' }}
                      className="text-[11px] hover:underline"
                    >
                      Auto-Generate
                    </button>
                    {!isCameraScanning && (
                      <button
                        type="button"
                        onClick={startScanner}
                        style={{ color: 'var(--sw-primary)' }}
                        className="text-[11px] hover:underline flex items-center space-x-1"
                      >
                        <Camera className="w-3 h-3" />
                        <span>Scan Camera</span>
                      </button>
                    )}
                  </div>
                </div>

                {isCameraScanning ? (
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-black mb-2 border border-[var(--sw-primary)]">
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      playsInline
                      muted
                    />
                    <canvas ref={canvasRef} className="hidden" />
                    <button
                      onClick={stopScanner}
                      className="absolute top-2 right-2 px-2 py-1 bg-red-600/80 rounded text-[10px] text-white"
                    >
                      Stop Camera
                    </button>
                  </div>
                ) : (
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="e.g. BATH_TOOTHPASTE_01"
                      value={codeValue}
                      onChange={(e) => setCodeValue(e.target.value)}
                      style={{ backgroundColor: 'var(--sw-surface)' }}
                      className="flex-1 border border-gray-700 focus:border-[var(--sw-primary)] rounded-lg py-2 px-3 text-xs text-white font-mono outline-none"
                    />
                    <select
                      value={codeFormat}
                      onChange={(e) => setCodeFormat(e.target.value as any)}
                      style={{ backgroundColor: 'var(--sw-surface)' }}
                      className="border border-gray-700 rounded-lg px-2 text-xs text-gray-300"
                    >
                      <option value="QR_CODE">QR Code</option>
                      <option value="EAN_13">EAN-13</option>
                      <option value="CODE_128">Code-128</option>
                      <option value="UPC_A">UPC-A</option>
                    </select>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleSaveNewTag}
                disabled={!name.trim() || !codeValue.trim()}
                style={{ backgroundColor: 'var(--sw-secondary)', color: 'var(--sw-bg)' }}
                className="w-full py-2 disabled:opacity-40 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1 mt-2"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Physical Tag</span>
              </button>
            </div>
          </div>
        )}

        {/* Tags List */}
        <div className="space-y-2.5 max-h-[340px] overflow-y-auto no-scrollbar">
          {tags.map((tag) => (
            <div
              key={tag.id}
              style={{ backgroundColor: 'var(--sw-bg)' }}
              className="p-3 rounded-xl border border-gray-800 hover:border-gray-700 transition flex items-center justify-between gap-2"
            >
              <div className="flex items-start space-x-3 truncate">
                <div
                  style={{
                    backgroundColor: 'var(--sw-surface)',
                    color: 'var(--sw-primary)',
                  }}
                  className="p-2 rounded-lg border border-gray-800 shrink-0"
                >
                  <QrCode className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <div className="font-bold text-xs sm:text-sm text-white truncate">
                    {tag.name}
                  </div>
                  <div className="text-[11px] text-gray-400 flex items-center space-x-1 mt-0.5 truncate">
                    <MapPin
                      className="w-3 h-3 shrink-0"
                      style={{ color: 'var(--sw-accent)' }}
                    />
                    <span className="truncate">{tag.location}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-1.5 shrink-0">
                <button
                  onClick={() => downloadTagAsPng(tag)}
                  style={{
                    backgroundColor: 'var(--sw-surface)',
                    color: 'var(--sw-primary)',
                  }}
                  className="py-1.5 px-2.5 border border-gray-700 hover:border-[var(--sw-primary)] rounded-lg text-xs font-bold transition flex items-center space-x-1"
                  title="Download Printable PNG"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">PNG</span>
                </button>
                <button
                  onClick={() => setSelectedTagToView(tag)}
                  style={{
                    backgroundColor: 'var(--sw-surface)',
                    color: 'var(--sw-accent)',
                  }}
                  className="py-1.5 px-2.5 border border-gray-700 rounded-lg text-xs font-medium transition flex items-center space-x-1"
                  title="Preview & Download Code"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Preview</span>
                </button>
                <button
                  onClick={() => onDeleteTag(tag.id)}
                  aria-label={`Delete ${tag.name}`}
                  className="p-1.5 text-gray-500 hover:text-red-400 transition"
                  title="Delete Tag"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* View Scannable Code Modal with Download PNG & SVG */}
        {selectedTagToView && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="tag-preview-title"
            className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4"
          >
            <div
              style={{
                backgroundColor: 'var(--sw-surface)',
                borderColor: 'var(--sw-primary)',
              }}
              className="border rounded-2xl max-w-sm w-full p-5 text-center text-white relative"
            >
              <button
                onClick={() => setSelectedTagToView(null)}
                aria-label="Close Preview"
                className="absolute top-3.5 right-3.5 p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800"
              >
                <X className="w-5 h-5" />
              </button>

              <h3
                id="tag-preview-title"
                style={{ color: 'var(--sw-primary)' }}
                className="text-lg font-bold"
              >
                {selectedTagToView.name}
              </h3>
              <p className="text-xs text-gray-300 mb-4">{selectedTagToView.location}</p>

              {/* Scannable SVG Render */}
              <div className="bg-white p-4 rounded-xl inline-block shadow-lg mb-4">
                {selectedTagToView.codeFormat === 'QR_CODE' ? (
                  <div
                    dangerouslySetInnerHTML={{
                      __html: generateQrSvg(selectedTagToView.codeValue, 190),
                    }}
                  />
                ) : (
                  <div
                    dangerouslySetInnerHTML={{
                      __html: generateBarcodeSvg(
                        selectedTagToView.codeValue,
                        selectedTagToView.codeFormat,
                        210,
                        90
                      ),
                    }}
                  />
                )}
              </div>

              <div
                style={{ backgroundColor: 'var(--sw-bg)' }}
                className="text-xs font-mono text-gray-300 p-2 rounded-lg break-all mb-4"
              >
                {selectedTagToView.codeValue}
              </div>

              {/* Download Options */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  onClick={() => downloadTagAsPng(selectedTagToView)}
                  style={{
                    backgroundColor: 'var(--sw-primary)',
                    color: 'var(--sw-bg)',
                  }}
                  className="py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 hover:opacity-90"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PNG</span>
                </button>
                <button
                  onClick={() => downloadTagAsSvg(selectedTagToView)}
                  style={{ backgroundColor: 'var(--sw-bg)' }}
                  className="py-2 px-3 rounded-xl border border-gray-700 hover:border-gray-500 text-xs font-bold text-white flex items-center justify-center space-x-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download SVG</span>
                </button>
              </div>

              <button
                onClick={() => setSelectedTagToView(null)}
                className="w-full py-2 text-xs text-gray-400 hover:text-white"
              >
                Close Preview
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
