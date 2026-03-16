import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useTournamentStore } from '../../store/tournamentStore';
import { generateShareUrl } from '../../utils/stateEncoder';
import { Modal } from '../UI/Modal';

export function ShareModal({ isOpen, onClose }) {
  const { getExportableState, id } = useTournamentStore();

  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && id) {
      const state = getExportableState();
      const url = generateShareUrl(state);
      setShareUrl(url);
    }
  }, [isOpen, id]); // eslint-disable-line react-hooks/exhaustive-deps

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('Nie udało się skopiować');
    }
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Turniej Tenisa',
          text: 'Dołącz do turnieju!',
          url: shareUrl
        });
      } catch (error) {
        if (error?.name !== 'AbortError') {
          copyToClipboard();
        }
      }
    } else {
      copyToClipboard();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Udostępnij Turniej" size="md">
      <div className="space-y-6">
        {/* QR Code */}
        <div className="flex flex-col items-center fade-in">
          <div className="relative p-5 bg-white rounded-3xl shadow-xl border-2 border-gray-100">
            <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-tennis-500 rounded-tl-lg" />
            <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-tennis-500 rounded-tr-lg" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-tennis-500 rounded-bl-lg" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-tennis-500 rounded-br-lg" />

            <QRCodeSVG
              value={shareUrl}
              size={200}
              level="M"
              includeMargin={false}
              bgColor="#ffffff"
              fgColor="#166534"
            />
          </div>
          <p className="text-sm text-gray-500 mt-4 text-center flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            Zeskanuj kod na innym urządzeniu
          </p>
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500">lub</span>
          </div>
        </div>

        {/* Share Link */}
        <div className="slide-up" style={{ animationDelay: '0.1s' }}>
          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <svg className="w-4 h-4 text-tennis-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Link do turnieju
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="input text-sm flex-1 bg-gray-50 font-mono"
              onClick={(e) => e.target.select()}
            />
            <button
              onClick={copyToClipboard}
              className={`
                btn-secondary whitespace-nowrap transition-all duration-300
                ${copied ? 'bg-green-100 text-green-700 border-green-300' : ''}
              `}
            >
              {copied ? (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Skopiowano
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  Kopiuj
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Native Share (mobile) */}
        {typeof navigator !== 'undefined' && navigator.share && (
          <button onClick={shareNative} className="btn-primary w-full slide-up" style={{ animationDelay: '0.2s' }}>
            <span className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Udostępnij...
            </span>
          </button>
        )}

        {/* Info */}
        <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-2xl border border-yellow-200 slide-up" style={{ animationDelay: '0.3s' }}>
          <div className="w-8 h-8 bg-yellow-200 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-yellow-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-sm text-yellow-800">
            <span className="font-semibold">Uwaga:</span> Link zawiera aktualny stan turnieju.
            Po zaimportowaniu dane będą zsynchronizowane do momentu udostępnienia.
          </div>
        </div>
      </div>
    </Modal>
  );
}
