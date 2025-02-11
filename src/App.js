import React from 'react';
import CameraCapture from './components/CameraCapture';

function App() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Détection de texte</h1>
      <CameraCapture />
    </div>
  );
}

export default App;
