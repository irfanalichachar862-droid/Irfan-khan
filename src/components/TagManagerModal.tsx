import React, { useRef, useState } from 'react';
import {
  Camera,
  Check,
  Copy,
  ExternalLink,
  Hash,
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
import { generateBarcodeSvg, generateQrSvg } from '../utils/qrGenerator';

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

  // New tag form state
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
          if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tag-manager-title"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-[#1C232B] border border-[#4ADEDE]/30 rounded-2xl max-w-xl w-full p-6 text-white shadow-2xl relative my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-[#4ADEDE]/10 text-[#4ADEDE] rounded-xl border border-[#4ADEDE]/30">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 id="tag-manager-title" className="text-lg font-bold text-white">Physical Tag Registry</h2>
              <p className="text-xs text-gray-400">Everyday barcodes placed around the house to force wakefulness</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar */}
        <div className="py-4 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {tags.length} registered barcode / QR tags
          </span>
          {!isRegistering && (
            <button
              onClick={() => setIsRegistering(true)}
              className="py-1.5 px-3 rounded-xl bg-[#4ADEDE] hover:bg-[#64CCC5] text-[#0B0E11] text-xs font-bold transition flex items-center space-x-1.5 shadow-[0_0_12px_rgba(74,222,222,0.3)]"
            >
              <Plus className="w-4 h-4" />
              <span>Register New Tag</span>
            </button>
          )}
        </div>

        {/* Register Tag Form */}
        {isRegistering && (
          <div className="mb-6 p-4 rounded-xl bg-[#0B0E11] border border-[#4ADEDE]/40">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-[#4ADEDE] flex items-center gap-1.5">
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
                  className="w-full bg-[#1C232B] border border-gray-700 focus:border-[#4ADEDE] rounded-lg py-2 px-3 text-xs text-white outline-none"
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
                  className="w-full bg-[#1C232B] border border-gray-700 focus:border-[#4ADEDE] rounded-lg py-2 px-3 text-xs text-white outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-gray-300 uppercase">
                    Barcode / QR Value
                  </label>
                  {!isCameraScanning && (
                    <button
                      type="button"
                      onClick={startScanner}
                      className="text-[11px] text-[#4ADEDE] hover:underline flex items-center space-x-1"
                    >
                      <Camera className="w-3 h-3" />
                      <span>Scan with Camera</span>
                    </button>
                  )}
                </div>

                {isCameraScanning ? (
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-black mb-2 border border-[#4ADEDE]">
                    <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                    <canvas ref={canvasRef} className="hidden" />
                    <button
                      onClick={stopScanner}
                      className="absolute top-2 right-2 px-2 py-1 bg-red-600/80 rounded text-[10px] text-white"
                    >
                      Stop Camera
                    </button>
                    <div className="absolute inset-4 border border-[#4ADEDE]/40 rounded pointer-events-none flex items-center justify-center">
                      <span className="text-[10px] text-white bg-black/60 px-2 py-0.5 rounded">
                        Aim at Barcode / QR Code
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="e.g. 7622210449283 or BATH_TOOTHPASTE_01"
                      value={codeValue}
                      onChange={(e) => setCodeValue(e.target.value)}
                      className="flex-1 bg-[#1C232B] border border-gray-700 focus:border-[#4ADEDE] rounded-lg py-2 px-3 text-xs text-white font-mono outline-none"
                    />
                    <select
                      value={codeFormat}
                      onChange={(e) => setCodeFormat(e.target.value as any)}
                      className="bg-[#1C232B] border border-gray-700 rounded-lg px-2 text-xs text-gray-300"
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
                className="w-full py-2 bg-[#64CCC5] hover:bg-[#7DE2D1] disabled:opacity-40 text-[#0B0E11] rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1 mt-2"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save to Room Database</span>
              </button>
            </div>
          </div>
        )}

        {/* Tags List */}
        <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="p-3.5 rounded-xl bg-[#0B0E11] border border-gray-800 hover:border-gray-700 transition flex items-center justify-between"
            >
              <div className="flex items-start space-x-3 truncate">
                <div className="p-2.5 rounded-lg bg-[#1C232B] text-[#4ADEDE] border border-gray-800 shrink-0">
                  <QrCode className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <div className="font-bold text-sm text-white truncate">{tag.name}</div>
                  <div className="text-xs text-gray-400 flex items-center space-x-1.5 mt-0.5">
                    <MapPin className="w-3 h-3 text-[#7DE2D1]" />
                    <span>{tag.location}</span>
                    <span className="text-gray-600">•</span>
                    <span className="font-mono text-[10px] text-gray-500">{tag.codeFormat}</span>
                  </div>
                  <div className="text-[10px] font-mono text-[#4ADEDE]/80 truncate mt-0.5">
                    Hash: {tag.codeHash}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={() => setSelectedTagToView(tag)}
                  className="py-1.5 px-2.5 bg-[#1C232B] hover:bg-[#26303B] text-[#7DE2D1] border border-[#7DE2D1]/30 rounded-lg text-xs font-medium transition flex items-center space-x-1"
                  title="View / Print Scannable Code"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">View Code</span>
                </button>
                <button
                  onClick={() => onDeleteTag(tag.id)}
                  className="p-1.5 text-gray-500 hover:text-red-400 transition"
                  title="Delete Tag"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* View Scannable Code Modal */}
        {selectedTagToView && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="tag-preview-title"
            className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4"
          >
            <div className="bg-[#1C232B] border border-[#4ADEDE] rounded-2xl max-w-sm w-full p-6 text-center text-white relative">
              <button
                onClick={() => setSelectedTagToView(null)}
                className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 id="tag-preview-title" className="text-lg font-bold text-[#4ADEDE]">{selectedTagToView.name}</h3>
              <p className="text-xs text-gray-300 mb-4">{selectedTagToView.location}</p>

              {/* Scannable SVG Render */}
              <div className="bg-white p-4 rounded-xl inline-block shadow-lg mb-4">
                {selectedTagToView.codeFormat === 'QR_CODE' ? (
                  <div
                    dangerouslySetInnerHTML={{
                      __html: generateQrSvg(selectedTagToView.codeValue, 200),
                    }}
                  />
                ) : (
                  <div
                    dangerouslySetInnerHTML={{
                      __html: generateBarcodeSvg(
                        selectedTagToView.codeValue,
                        selectedTagToView.codeFormat,
                        220,
                        90
                      ),
                    }}
                  />
                )}
              </div>

              <div className="text-xs font-mono text-gray-400 bg-[#0B0E11] p-2 rounded-lg break-all mb-4">
                Value: {selectedTagToView.codeValue}
              </div>

              <p className="text-[11px] text-gray-400 leading-normal mb-2">
                Point your mobile or webcam at this screen to test scanning, or print and tape it to the item.
              </p>

              <button
                onClick={() => setSelectedTagToView(null)}
                className="w-full py-2 bg-[#4ADEDE] text-[#0B0E11] rounded-xl text-xs font-bold"
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
