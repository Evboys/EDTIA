import React, { useState, useEffect, useRef } from 'react';
import { Camera } from '@capacitor/camera';
import { createWorker, createScheduler } from 'tesseract.js';

const CameraCapture = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [extractedText, setExtractedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasValidResult, setHasValidResult] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(false);
  const workerRef = useRef(null);
  const streamRef = useRef(null);
  const lastSuccessRef = useRef(Date.now());
  const analysisCountRef = useRef(0);

  useEffect(() => {
    initializeCamera();
    initializeTesseract();
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  const initializeTesseract = async () => {
    try {
      workerRef.current = await createWorker();
      await workerRef.current.loadLanguage('fra');
      await workerRef.current.initialize('fra');
      await workerRef.current.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-',
      });
    } catch (error) {
      console.error('Erreur d\'initialisation de Tesseract:', error);
    }
  };

  const stopCurrentStream = () => {
    if (streamRef.current) {
      const tracks = streamRef.current.getTracks();
      tracks.forEach(track => track.stop());
    }
  };

  const initializeCamera = async () => {
    try {
      stopCurrentStream();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: isFrontCamera ? 'user' : 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        startAnalysis();
      }
    } catch (error) {
      console.error('Erreur d\'accès à la caméra:', error);
      setExtractedText('Erreur d\'accès à la caméra');
    }
  };

  const toggleCamera = () => {
    setIsFrontCamera(!isFrontCamera);
    setHasValidResult(false);
    setExtractedText('');
    setIsAnalyzing(false);
    setTimeout(() => {
      initializeCamera();
    }, 100);
  };

  const preprocessText = (text) => {
    return text
      .replace(/[oO]/g, '0') // Remplace o et O par 0
      .replace(/\s+/g, '') // Supprime tous les espaces
      .trim();
  };

  const isValidFormat = (text) => {
    // Vérifie si le texte correspond aux formats M<1-2 chiffres>-TP ou M<1-2 chiffres>-TD
    // Accepte M1-TP, M01-TP, M12-TD mais pas M123-TP
    const regex = /^M[0-9]{1,2}-T[DP]$/;
    return regex.test(text);
  };

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current || !workerRef.current || hasValidResult) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL('image/jpeg');
  };

  const reinitializeWorker = async () => {
    console.log('Réinitialisation du worker Tesseract...');
    if (workerRef.current) {
      await workerRef.current.terminate();
    }
    await initializeTesseract();
    lastSuccessRef.current = Date.now();
    analysisCountRef.current = 0;
  };

  const analyzeFrame = async (frameData) => {
    if (!frameData || !workerRef.current || hasValidResult) return;

    try {
      analysisCountRef.current++;
      const currentTime = Date.now();
      const timeSinceLastSuccess = currentTime - lastSuccessRef.current;

      // Réinitialiser si aucun résultat depuis 10 secondes et au moins 20 tentatives
      if (timeSinceLastSuccess > 10000 && analysisCountRef.current > 20) {
        await reinitializeWorker();
        return;
      }

      const result = await workerRef.current.recognize(frameData);
      const text = result.data.text || '';
      console.log('Texte détecté:', text);

      const lines = text.split('\n');
      for (const line of lines) {
        const processed = preprocessText(line);
        console.log('Texte traité:', processed);

        if (isValidFormat(processed)) {
          console.log('Format valide trouvé:', processed);
          setExtractedText(processed);
          setHasValidResult(true);
          setIsAnalyzing(false);
          lastSuccessRef.current = currentTime;
          return;
        }
      }
    } catch (error) {
      console.error('Erreur lors de l\'analyse:', error);
      setIsAnalyzing(false);
    }
  };

  const startAnalysis = () => {
    if (hasValidResult) return;

    setIsAnalyzing(true);
    let analysisInterval;

    const analyzeLoop = async () => {
      if (hasValidResult) {
        clearInterval(analysisInterval);
        return;
      }

      const frameData = captureFrame();
      if (frameData) {
        await analyzeFrame(frameData);
      }
    };

    // Lancer l'analyse toutes les 500ms
    analysisInterval = setInterval(analyzeLoop, 500);

    // Nettoyer l'intervalle quand le composant est démonté
    return () => clearInterval(analysisInterval);
  };

  const resetAnalysis = async () => {
    setHasValidResult(false);
    setExtractedText('');
    setIsAnalyzing(true);
    await reinitializeWorker();
    setTimeout(() => {
      startAnalysis();
    }, 100);
  };

  return (
    <div className="fixed inset-0 bg-black">
      {/* Conteneur principal en flex column avec safe areas */}
      <div className="flex flex-col h-full relative pt-safe pb-safe">
        {/* En-tête avec le bouton de changement de caméra */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/50 to-transparent h-32">
          <div className="p-4 mt-safe">
            <button
              onClick={toggleCamera}
              className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full
                     hover:bg-white/30 transition-colors flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{isFrontCamera ? 'Caméra arrière' : 'Caméra avant'}</span>
            </button>
          </div>
        </div>

        {/* Vue caméra en plein écran */}
        <div className="flex-1 relative">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Safe area du bas */}
        <div className="h-safe-bottom bg-black absolute bottom-0 left-0 right-0 z-20" />

        {/* Zone de résultat en bas */}
        <div className="absolute left-0 right-0 bottom-safe p-4 bg-gradient-to-t from-black/50 to-transparent">
          {hasValidResult ? (
            <div className="space-y-4">
              <div className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-lg">
                <h3 className="font-semibold text-gray-800 text-sm">Format détecté</h3>
                <p className="text-2xl font-bold text-gray-900 mt-1">{extractedText}</p>
              </div>
              <button
                onClick={resetAnalysis}
                className="w-full bg-blue-500 text-white py-3 px-6 rounded-xl
                         hover:bg-blue-600 active:bg-blue-700 transition-colors
                         font-semibold shadow-lg"
              >
                Recommencer
              </button>
            </div>
          ) : (
            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl shadow-lg">
              <div className="flex items-center justify-center space-x-3">
                {isAnalyzing && (
                  <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                <p className="text-gray-900 font-medium">
                  {isAnalyzing ? 'Analyse en cours...' : 'Préparation de l\'analyse...'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CameraCapture;
