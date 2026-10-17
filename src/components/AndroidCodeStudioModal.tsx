import React, { useState } from 'react';
import {
  Check,
  Code2,
  Copy,
  Download,
  FileCode,
  Folder,
  FolderTree,
  Terminal,
  X,
} from 'lucide-react';
import JSZip from 'jszip';
import { ANDROID_SOURCE_FILES } from '../data/androidSourceFiles';

interface AndroidCodeStudioModalProps {
  onClose: () => void;
}

export const AndroidCodeStudioModal: React.FC<AndroidCodeStudioModalProps> = ({ onClose }) => {
  const [selectedFilePath, setSelectedFilePath] = useState<string>(
    'android/app/src/main/java/com/scanwake/app/ui/screens/LockoutRingingActivity.kt'
  );
  const [copied, setCopied] = useState<boolean>(false);
  const [isZipping, setIsZipping] = useState<boolean>(false);

  const currentFile = ANDROID_SOURCE_FILES.find((f) => f.path === selectedFilePath) || ANDROID_SOURCE_FILES[0];

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();

      ANDROID_SOURCE_FILES.forEach((file) => {
        // Strip leading android/ prefix for root zip convenience
        const zipPath = file.path.startsWith('android/') ? file.path.substring(8) : file.path;
        zip.file(zipPath, file.content);
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ScanWake-Android-Project.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to generate ZIP', e);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="code-studio-title"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-hidden"
    >
      <div className="bg-[#0B0E11] border border-[#4ADEDE]/40 rounded-2xl max-w-5xl w-full h-[90vh] flex flex-col text-white shadow-2xl overflow-hidden">
        {/* Header Bar */}
        <div className="p-4 bg-[#1C232B] border-b border-gray-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#4ADEDE]/10 text-[#4ADEDE] rounded-xl border border-[#4ADEDE]/30">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h2 id="code-studio-title" className="text-base font-bold text-white flex items-center space-x-2">
                <span>ScanWake Android Architecture & Codebase</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#4ADEDE]/20 text-[#4ADEDE] border border-[#4ADEDE]/30 font-mono">
                  Kotlin + Compose + Room + CameraX
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                Production-grade architecture ready for VS Code, Cursor, or Gradle CLI
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadZip}
              disabled={isZipping}
              className="py-1.5 px-3.5 bg-[#64CCC5] hover:bg-[#7DE2D1] text-[#0B0E11] text-xs font-bold rounded-xl transition flex items-center space-x-1.5 shadow-[0_0_12px_rgba(100,204,197,0.3)] disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isZipping ? 'Bundling...' : 'Download Project (.ZIP)'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Split: File Tree on left, Code Viewer on right */}
        <div className="flex-1 flex overflow-hidden">
          {/* File Explorer Sidebar */}
          <div className="w-72 bg-[#141920] border-r border-gray-800 flex flex-col shrink-0">
            <div className="p-3 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-800/80 flex items-center space-x-1.5">
              <FolderTree className="w-3.5 h-3.5 text-[#4ADEDE]" />
              <span>Project Files</span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {ANDROID_SOURCE_FILES.map((file) => {
                const isSelected = file.path === selectedFilePath;
                const fileName = file.path.split('/').pop() || file.path;
                const category = file.category;

                return (
                  <button
                    key={file.path}
                    onClick={() => setSelectedFilePath(file.path)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-[#1C232B] text-[#4ADEDE] border border-[#4ADEDE]/40 font-semibold'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-[#1C232B]/50'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <FileCode className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-[#4ADEDE]' : 'text-gray-500'}`} />
                      <span className="truncate">{fileName}</span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-gray-800 text-gray-400 shrink-0 ml-1">
                      {category}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Quick CLI Build Helper */}
            <div className="p-3 bg-[#0B0E11] border-t border-gray-800 text-[11px] text-gray-400">
              <div className="flex items-center space-x-1 font-bold text-gray-300 mb-1">
                <Terminal className="w-3 h-3 text-[#4ADEDE]" />
                <span>Build Command</span>
              </div>
              <code className="block bg-[#1C232B] text-[#4ADEDE] p-1.5 rounded font-mono text-[10px]">
                ./gradlew assembleDebug
              </code>
            </div>
          </div>

          {/* Main Code Viewer */}
          <div className="flex-1 bg-[#0B0E11] flex flex-col overflow-hidden">
            <div className="p-3 bg-[#11161D] border-b border-gray-800 flex items-center justify-between shrink-0">
              <div className="text-xs font-mono text-gray-300 flex items-center space-x-2 truncate">
                <span className="text-[#4ADEDE] font-semibold">{currentFile.path}</span>
              </div>
              <button
                onClick={handleCopyCode}
                className="py-1 px-3 bg-[#1C232B] hover:bg-[#26303B] text-gray-300 hover:text-white rounded-lg text-xs transition flex items-center space-x-1.5 border border-gray-700"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-bold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy File</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 font-mono text-xs text-gray-200 leading-relaxed bg-[#0B0E11] select-text">
              <pre className="whitespace-pre">
                {currentFile.content}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
