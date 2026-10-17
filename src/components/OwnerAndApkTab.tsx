import React, { useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Cpu,
  Download,
  FileArchive,
  Mail,
  QrCode,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import JSZip from 'jszip';
import { ANDROID_SOURCE_FILES } from '../data/androidSourceFiles';
import { AlarmChain, AlarmItem, RegisteredTag } from '../utils/antiCheatRules';
import { TaskItem } from '../utils/taskManagerRules';
import { generateQrSvg } from '../utils/qrGenerator';
import { usePWAInstall } from '../utils/usePWAInstall';
import { ScanWakeLogo } from './ScanWakeLogo';

interface OwnerAndApkTabProps {
  alarms: AlarmItem[];
  tags: RegisteredTag[];
  chains: AlarmChain[];
  tasks: TaskItem[];
}

export const OwnerAndApkTab: React.FC<OwnerAndApkTabProps> = ({
  alarms,
  tags,
  chains,
  tasks,
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [isExportingApkZip, setIsExportingApkZip] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [showInstallSteps, setShowInstallSteps] = useState(false);

  const ownerName = 'Irfan Khan';
  const ownerEmail = 'irfanalichachar862@gmail.com';
  const appUrl =
    typeof window !== 'undefined' ? window.location.origin : 'https://scanwake.app';

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(ownerEmail);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleDirectInstall = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowInstallSteps(true);
    }
  };

  /**
   * Exports the Android Mobile APK Builder Package (.ZIP)
   * Includes Background Auto-Start & Lockscreen guards + GitHub Actions Cloud APK Compiler
   */
  const handleExportAndroidApkPackage = async () => {
    setIsExportingApkZip(true);
    setExportStatus(null);
    try {
      const zip = new JSZip();

      // Add all core Android Kotlin / Compose / Room / CameraX source files
      ANDROID_SOURCE_FILES.forEach((file) => {
        const zipPath = file.path.startsWith('android/')
          ? file.path.substring(8)
          : file.path;
        zip.file(zipPath, file.content);
      });

      // Add Android System Auto-Start & Battery Guard helper
      const systemGuardHelperCode = `package com.scanwake.app.util

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.PowerManager
import android.provider.Settings

/**
 * Android 14 System Guard & Battery Optimization Helper
 * Configured for Owner: Irfan Khan (irfanalichachar862@gmail.com)
 * Ensures Android background management does not throttle or kill ScanWake alarms overnight.
 */
object AndroidSystemGuard {
    const val OWNER_NAME = "Irfan Khan"
    const val OWNER_EMAIL = "irfanalichachar862@gmail.com"

    fun openAppPermissionSettings(context: Context) {
        val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
            data = Uri.fromParts("package", context.packageName, null)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
    }

    fun requestIgnoreBatteryOptimizations(context: Context) {
        val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        if (!pm.isIgnoringBatteryOptimizations(context.packageName)) {
            val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                data = Uri.parse("package:\${context.packageName}")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        }
    }
}
`;
      zip.file(
        'app/src/main/java/com/scanwake/app/util/AndroidSystemGuard.kt',
        systemGuardHelperCode
      );

      // Add GitHub Actions 1-Click Cloud APK Builder so Irfan Khan can compile the signed APK online
      const githubWorkflow = `name: Build ScanWake Android APK

on:
  push:
    branches: [ main, master ]
  workflow_dispatch:

jobs:
  build-android-apk:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout ScanWake Source
        uses: actions/checkout@v4

      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'

      - name: Setup Gradle
        uses: gradle/actions/setup-gradle@v3
        with:
          gradle-version: '8.7'

      - name: Build Android Debug APK
        run: gradle assembleDebug --no-daemon

      - name: Upload Ready-to-Install Android APK
        uses: actions/upload-artifact@v4
        with:
          name: ScanWake-Android-IrfanKhan.apk
          path: app/build/outputs/apk/debug/app-debug.apk
`;
      zip.file('.github/workflows/build-android-apk.yml', githubWorkflow);

      // Export current user configuration JSON (Alarms, Tasks, QR Tags, Chains, Owner Info)
      const userConfigJson = JSON.stringify(
        {
          owner: {
            name: ownerName,
            email: ownerEmail,
            os: 'Android 14 (SDK 34)',
          },
          exportedAt: new Date().toISOString(),
          alarms,
          tasks,
          tags,
          chains,
        },
        null,
        2
      );
      zip.file('app/src/main/assets/scanwake_preset_config.json', userConfigJson);

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ScanWake-Android-APK-Package.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportStatus(
        'Downloaded ScanWake-Android-APK-Package.zip (Configured for Irfan Khan)'
      );
    } catch (e) {
      console.error('APK package export failed', e);
    } finally {
      setIsExportingApkZip(false);
    }
  };

  /**
   * Exports a standalone installable mobile configuration & WebAPK launcher file
   */
  const handleDownloadMobileLauncher = () => {
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="theme-color" content="#0B0E11" />
  <title>ScanWake — ${ownerName}</title>
  <style>
    body { background: #0B0E11; color: #FFFFFF; font-family: system-ui, sans-serif; margin: 0; padding: 24px; text-align: center; }
    .card { background: #1C232B; border: 2px solid #4ADEDE; border-radius: 20px; padding: 24px; max-width: 420px; margin: 20px auto; }
    .badge { display: inline-block; background: rgba(74,222,222,0.15); color: #4ADEDE; padding: 6px 14px; border-radius: 999px; font-size: 12px; font-weight: bold; margin-bottom: 12px; }
    h1 { margin: 8px 0; font-size: 26px; color: #FFFFFF; }
    p { color: #8C9BA8; font-size: 14px; line-height: 1.5; }
    .btn { display: block; width: 100%; box-sizing: border-box; background: #4ADEDE; color: #0B0E11; font-weight: 800; padding: 14px; border-radius: 12px; text-decoration: none; margin-top: 16px; font-size: 15px; }
    .meta { text-align: left; background: #0B0E11; padding: 14px; border-radius: 12px; margin-top: 16px; font-size: 13px; }
    .meta div { margin-bottom: 6px; }
    .meta strong { color: #7DE2D1; }
  </style>
</head>
<body>
  <div class="card">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" fill="none" style="margin: 0 auto 12px; display: block;">
      <rect width="64" height="64" rx="14" fill="#0B0E11" stroke="#4ADEDE" stroke-width="2"/>
      <path d="M11 16L21 8" stroke="#4ADEDE" stroke-width="4.2" stroke-linecap="round"/>
      <path d="M53 16L43 8" stroke="#4ADEDE" stroke-width="4.2" stroke-linecap="round"/>
      <path d="M32 6V11" stroke="#7DE2D1" stroke-width="3.8" stroke-linecap="round"/>
      <circle cx="32" cy="34" r="22" stroke="#4ADEDE" stroke-width="3.6"/>
      <rect x="17" y="21" width="11" height="11" rx="2" stroke="#7DE2D1" stroke-width="2.6"/>
      <rect x="20.5" y="24.5" width="4" height="4" rx="0.8" fill="#4ADEDE"/>
      <rect x="17" y="35" width="4" height="4" rx="0.8" fill="#7DE2D1"/>
      <rect x="23" y="35" width="4" height="4" rx="0.8" fill="#4ADEDE"/>
      <rect x="19" y="41" width="4" height="4" rx="0.8" fill="#4ADEDE"/>
      <circle cx="32" cy="34" r="2.8" fill="#FFFFFF"/>
      <path d="M32 34V22" stroke="#FFFFFF" stroke-width="3.2" stroke-linecap="round"/>
      <path d="M32 34L42 28" stroke="#7DE2D1" stroke-width="3" stroke-linecap="round"/>
      <circle cx="46" cy="46" r="12.5" fill="#4ADEDE" stroke="#0B0E11" stroke-width="3"/>
      <path d="M40.5 46.2L44.2 50L51.8 42" stroke="#0B0E11" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <span class="badge">ANDROID MOBILE EDITION</span>
    <h1>ScanWake Mobile Launcher</h1>
    <p>Anti-Cheat Physical QR Wake-Up Alarm &amp; Task Tracker configured for <strong>${ownerName}</strong></p>
    <div class="meta">
      <div><strong>Owner:</strong> ${ownerName}</div>
      <div><strong>Email:</strong> ${ownerEmail}</div>
      <div><strong>Configured Alarms:</strong> ${alarms.length}</div>
      <div><strong>Active Tasks:</strong> ${tasks.length}</div>
      <div><strong>Registered QR Tags:</strong> ${tags.length}</div>
    </div>
    <a class="btn" href="${appUrl}">Launch &amp; Install Full App on Android Phone</a>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ScanWake-Android-Mobile-Installer.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setExportStatus('Downloaded ScanWake-Android-Mobile-Installer.html for your mobile phone!');
  };

  return (
    <div className="space-y-5">
      {/* Owner Profile Card: Irfan Khan */}
      <div
        style={{
          backgroundColor: 'var(--sw-surface)',
          borderColor: 'color-mix(in srgb, var(--sw-primary) 45%, transparent)',
        }}
        className="p-5 sm:p-6 rounded-2xl border shadow-lg relative overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center space-x-4">
            <ScanWakeLogo size={60} />
            <div className="space-y-1 min-w-0">
              <div className="text-xs font-semibold text-gray-400">
                Application Owner &amp; Creator
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {ownerName}
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-gray-300">
                <span className="inline-flex items-center space-x-1.5 font-mono text-xs sm:text-sm">
                  <Mail className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--sw-primary)' }} />
                  <a
                    href={`mailto:${ownerEmail}`}
                    className="hover:underline break-all"
                    style={{ color: 'var(--sw-accent)' }}
                  >
                    {ownerEmail}
                  </a>
                </span>
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  style={{ backgroundColor: 'var(--sw-bg)' }}
                  className="py-1 px-2.5 rounded-lg border border-gray-700 hover:border-gray-500 text-[11px] font-semibold text-gray-200 flex items-center space-x-1 transition"
                >
                  {copiedEmail ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy Email</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Generic Android Platform Summary */}
          <div
            style={{ backgroundColor: 'var(--sw-bg)' }}
            className="p-3.5 rounded-xl border border-gray-800 flex items-center space-x-3 shrink-0"
          >
            <div
              style={{
                backgroundColor: 'color-mix(in srgb, var(--sw-primary) 15%, transparent)',
                color: 'var(--sw-primary)',
              }}
              className="p-2.5 rounded-xl"
            >
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-gray-400">Platform Architecture</div>
              <div className="text-sm font-bold text-white">Android Mobile APK</div>
              <div className="text-[11px]" style={{ color: 'var(--sw-accent)' }}>
                Android 14 (SDK 34) • Offline ML Kit
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Export Status Toast */}
      {exportStatus && (
        <div
          style={{
            backgroundColor: 'var(--sw-surface)',
            borderColor: 'var(--sw-primary)',
          }}
          className="p-3.5 rounded-xl border text-xs font-bold text-white flex items-center justify-between"
        >
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: 'var(--sw-primary)' }} />
            <span>{exportStatus}</span>
          </div>
          <button
            onClick={() => setExportStatus(null)}
            className="text-gray-400 hover:text-white ml-2"
          >
            Close
          </button>
        </div>
      )}

      {/* APK Export & Android Mobile Installation Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Direct Install WebAPK + Native APK Builder Export */}
        <div
          style={{ backgroundColor: 'var(--sw-surface)' }}
          className="p-5 rounded-2xl border border-gray-800 flex flex-col justify-between space-y-4"
        >
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Android APK Exporter</span>
              {isInstalled && (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Installed</span>
                </span>
              )}
            </div>

            <h3 className="text-base font-bold text-white">
              Install &amp; Export Android Mobile APK
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Install directly as a standalone Android WebAPK onto your phone home screen or export
              the complete native Android APK package with background auto-start and lockscreen
              guards.
            </p>

            {/* Android Compatibility Checklist */}
            <div
              style={{ backgroundColor: 'var(--sw-bg)' }}
              className="p-3 rounded-xl border border-gray-800 space-y-1.5 text-xs"
            >
              <div className="font-bold text-gray-200 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" style={{ color: 'var(--sw-primary)' }} />
                <span>Android Mobile System Optimizations:</span>
              </div>
              <ul className="text-[11px] text-gray-400 space-y-1 pl-4 list-disc">
                <li>
                  <strong>Background Auto-Launch:</strong> Prevents overnight alarm battery freeze
                </li>
                <li>
                  <strong>Rear CameraX Binding:</strong> Fast barcode lock in low morning light
                </li>
                <li>
                  <strong>AMOLED Dark Lockout:</strong> High-contrast full-screen wake interface
                </li>
              </ul>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={handleDirectInstall}
              style={{
                backgroundColor: 'var(--sw-primary)',
                color: 'var(--sw-bg)',
              }}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-black transition flex items-center justify-center space-x-2 shadow-md hover:opacity-95"
            >
              <Smartphone className="w-4 h-4" />
              <span>
                {isInstalled
                  ? 'App Installed on Device'
                  : 'Install App on Android Mobile (WebAPK)'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleExportAndroidApkPackage}
              disabled={isExportingApkZip}
              style={{
                backgroundColor: 'var(--sw-secondary)',
                color: 'var(--sw-bg)',
              }}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 hover:opacity-95 disabled:opacity-50"
            >
              <FileArchive className="w-4 h-4" />
              <span>
                {isExportingApkZip
                  ? 'Packaging Android APK Project...'
                  : 'Export Android APK Package (.ZIP)'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleDownloadMobileLauncher}
              style={{ backgroundColor: 'var(--sw-bg)' }}
              className="w-full py-2 px-4 rounded-xl border border-gray-700 hover:border-gray-500 text-xs font-semibold text-gray-200 transition flex items-center justify-center space-x-1.5"
            >
              <Download className="w-3.5 h-3.5" style={{ color: 'var(--sw-primary)' }} />
              <span>Download Mobile Installer Launcher (.HTML)</span>
            </button>
          </div>
        </div>

        {/* Card 2: Scan QR with Mobile Camera to Install Directly */}
        <div
          style={{ backgroundColor: 'var(--sw-surface)' }}
          className="p-5 rounded-2xl border border-gray-800 flex flex-col justify-between items-center text-center space-y-3"
        >
          <div className="space-y-1">
            <div className="text-xs text-gray-400">Instant Mobile Pairing</div>
            <h3 className="text-base font-bold text-white">
              Scan with Mobile Camera to Install
            </h3>
            <p className="text-xs text-gray-400 max-w-xs">
              Open your phone camera, scan this QR code, and tap{' '}
              <strong>&ldquo;Add to Home screen / Install App&rdquo;</strong> in Chrome.
            </p>
          </div>

          <div className="bg-white p-3.5 rounded-2xl shadow-lg">
            <div
              dangerouslySetInnerHTML={{
                __html: generateQrSvg(appUrl, 165),
              }}
            />
          </div>

          <div
            style={{ backgroundColor: 'var(--sw-bg)' }}
            className="w-full p-3 rounded-xl border border-gray-800 text-left text-[11px] text-gray-300 space-y-1"
          >
            <div className="font-bold text-white">How to install on your Android phone:</div>
            <div>1. Open this app in Chrome on your Android mobile phone.</div>
            <div>
              2. Tap the Chrome menu (<strong>⋮</strong>) &rarr;{' '}
              <strong>Install app</strong> (or Add to Home screen).
            </div>
            <div>
              3. Go to <strong>Settings &rarr; Apps &rarr; ScanWake &rarr; Battery</strong> and
              enable <strong>Allow background activity</strong>.
            </div>
          </div>
        </div>
      </div>

      {/* Modal Guide when clicking Install on browsers where beforeinstallprompt is manual */}
      {showInstallSteps && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="android-install-guide-title"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            style={{
              backgroundColor: 'var(--sw-surface)',
              borderColor: 'var(--sw-primary)',
            }}
            className="border rounded-2xl max-w-md w-full p-5 text-white space-y-4 shadow-2xl"
          >
            <h3 id="android-install-guide-title" className="text-base font-bold text-white">
              Install ScanWake on Android Mobile
            </h3>
            <div className="text-xs text-gray-300 space-y-2 leading-relaxed">
              <p>
                <strong>Method A (Direct WebAPK on Phone):</strong> Open this URL in{' '}
                <strong>Google Chrome</strong> on your Android mobile phone, tap the top-right menu
                (<strong>⋮</strong>), and select <strong>Install app</strong>. Chrome automatically
                compiles and installs the signed ScanWake WebAPK onto your phone app drawer!
              </p>
              <p>
                <strong>Method B (Compile Native APK):</strong> Click{' '}
                <strong>&ldquo;Export Android APK Package (.ZIP)&rdquo;</strong> to download the
                full Android 14 Gradle project with the automated GitHub Actions APK builder.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowInstallSteps(false)}
              style={{
                backgroundColor: 'var(--sw-primary)',
                color: 'var(--sw-bg)',
              }}
              className="w-full py-2 rounded-xl text-xs font-bold"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
