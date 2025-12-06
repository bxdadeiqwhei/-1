import React, { useState, Suspense } from 'react';
import { Scene } from './components/Scene';
import { Controls } from './components/Controls';
import { Loader } from '@react-three/drei';

function App() {
  const [isLightsOn, setIsLightsOn] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);
  const [rotationSpeed, setRotationSpeed] = useState(1);
  const [isFormed, setIsFormed] = useState(true);

  return (
    <div className="relative w-full h-screen bg-[#f1f5f9] overflow-hidden selection:bg-gold-500 selection:text-black">
      {/* 3D Scene Layer */}
      <div className="absolute inset-0 z-0">
        <Suspense fallback={null}>
          <Scene 
            isLightsOn={isLightsOn} 
            autoRotate={autoRotate}
            rotationSpeed={rotationSpeed}
            isFormed={isFormed}
          />
        </Suspense>
      </div>

      {/* Loading Overlay */}
      <Loader 
        containerStyles={{ background: '#f1f5f9' }}
        innerStyles={{ width: '200px', height: '2px', background: '#e2e8f0' }}
        barStyles={{ background: '#FFD700', height: '2px' }}
        dataStyles={{ fontFamily: 'Playfair Display', color: '#0f172a' }}
      />

      {/* Foreground UI Layer */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-end p-8 md:p-12">
        
        {/* Footer/Controls */}
        <footer className="pointer-events-auto flex flex-col md:flex-row items-end md:items-center justify-end gap-6">
          <Controls 
            isLightsOn={isLightsOn} 
            toggleLights={() => setIsLightsOn(!isLightsOn)}
            autoRotate={autoRotate}
            toggleAutoRotate={() => setAutoRotate(!autoRotate)}
            isFormed={isFormed}
            toggleForm={() => setIsFormed(!isFormed)}
          />
        </footer>
      </div>
    </div>
  );
}

export default App;