import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { 
  OrbitControls, 
  PerspectiveCamera, 
  Environment, 
  ContactShadows, 
  Sparkles,
  Stars
} from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise, SMAA, N8AO } from '@react-three/postprocessing';
import * as THREE from 'three';
import { ChristmasTree } from './Tree';

interface SceneProps {
  isLightsOn: boolean;
  autoRotate: boolean;
  rotationSpeed: number;
  isFormed: boolean;
}

// Procedural Noise Texture for realistic snow surface
function useSnowTexture() {
  return useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    if (context) {
        // Fill base white
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, 512, 512);
        
        // Generate Noise
        const imgData = context.getImageData(0, 0, 512, 512);
        const data = imgData.data;
        for(let i = 0; i < data.length; i += 4) {
            // Value between 220 and 255 for subtle brightness variation
            const val = 220 + Math.random() * 35; 
            
            // Add slight blue tint variance
            const blueTint = Math.random() * 5;

            data[i] = val;     // R
            data[i+1] = val;   // G
            data[i+2] = val + blueTint; // B (Slightly cooler)
            data[i+3] = 255;   // Alpha
        }
        context.putImageData(imgData, 0, 0);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(16, 16); // High repeat for fine grain
    // Anisotropy helps texture look sharp at oblique angles
    texture.anisotropy = 16; 
    return texture;
  }, []);
}

const SnowGround = () => {
    const snowTexture = useSnowTexture();

    return (
        <group position={[0, -3.5, 0]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[100, 100]} />
                <meshStandardMaterial
                    color="#f8fafc" // Cool white base
                    map={snowTexture} // Adds the subtle noise color
                    bumpMap={snowTexture} // Adds physical bumps
                    bumpScale={0.08}
                    roughnessMap={snowTexture} // Varies shine (icy vs powdery)
                    roughness={0.7} 
                    metalness={0.1}
                    envMapIntensity={0.3}
                />
            </mesh>
             <Sparkles 
                size={2}
                scale={[20, 0.2, 20]}
                position={[0, 0.05, 0]}
                speed={0.4}
                count={500}
                color="#e2e8f0"
                opacity={0.4}
            />
        </group>
    )
}

const RhombusSnow = ({ count = 1500 }) => {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const { particles, dummy } = useMemo(() => {
    const dummy = new THREE.Object3D();
    const particles = [];
    for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * 50;
        const y = Math.random() * 30 - 5;
        const z = (Math.random() - 0.5) * 50;
        
        particles.push({
            pos: new THREE.Vector3(x, y, z),
            velocity: 0.02 + Math.random() * 0.04,
            swayFreq: 0.5 + Math.random(),
            swayAmp: 0.2 + Math.random() * 0.5,
            scale: 0.05 + Math.random() * 0.15,
            phase: Math.random() * Math.PI * 2,
            rotSpeedX: (Math.random() - 0.5) * 0.5,
            rotSpeedY: (Math.random() - 0.5) * 0.5,
            rotSpeedZ: (Math.random() - 0.5) * 0.5
        });
    }
    return { particles, dummy };
  }, [count]);

  useFrame((state) => {
      if (!mesh.current) return;
      const t = state.clock.elapsedTime;
      
      particles.forEach((p, i) => {
          p.pos.y -= p.velocity;
          if (p.pos.y < -5) {
              p.pos.y = 25;
              p.pos.x = (Math.random() - 0.5) * 50;
              p.pos.z = (Math.random() - 0.5) * 50;
          }
          
          const xOff = Math.sin(t * p.swayFreq + p.phase) * 0.05;
          const zOff = Math.cos(t * p.swayFreq + p.phase) * 0.05;

          dummy.position.set(p.pos.x + xOff, p.pos.y, p.pos.z + zOff);
          dummy.scale.setScalar(p.scale);
          dummy.rotation.set(
            t * p.rotSpeedX + p.phase, 
            t * p.rotSpeedY + p.phase, 
            t * p.rotSpeedZ + p.phase
          );

          dummy.updateMatrix();
          mesh.current!.setMatrixAt(i, dummy.matrix);
      });
      mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial 
            color="#ffffff" 
            emissive="#E0F2FE"
            emissiveIntensity={0.8}
            toneMapped={false}
            transparent 
            opacity={0.9}
            roughness={0.2}
            metalness={0.8}
        />
    </instancedMesh>
  );
}

const HolidayBackground = () => {
    return (
        <group>
            <color attach="background" args={['#f1f5f9']} />
            <RhombusSnow count={1500} />
        </group>
    )
}

export const Scene: React.FC<SceneProps> = ({ isLightsOn, autoRotate, rotationSpeed, isFormed }) => {
  return (
    <Canvas shadows dpr={[1, 2]}>
      {/* Moved camera back to frame the larger 10-unit high tree */}
      <PerspectiveCamera makeDefault position={[0, 2, 18]} fov={45} />
      
      <fog attach="fog" args={['#f1f5f9', 10, 50]} />
      
      {/* Warm Ambient Light with lower intensity */}
      <ambientLight intensity={0.15} color="#ffda79" />
      
      {/* Lifted spotlight to illuminate the top of the larger tree */}
      <spotLight 
        position={[10, 16, 10]} 
        angle={0.3} 
        penumbra={1} 
        intensity={20} 
        castShadow 
        shadow-bias={-0.0005}
        shadow-normalBias={0.04}
        shadow-mapSize={[2048, 2048]}
        color="#FFF9E5"
      />
      <spotLight 
        position={[-10, 12, -10]} 
        angle={0.3} 
        penumbra={1} 
        intensity={10} 
        color="#A7F3D0" 
      />
      <pointLight position={[0, -1, 0]} intensity={2} color="#FFD700" distance={8} />
      
      <HolidayBackground />

      <ChristmasTree isLightsOn={isLightsOn} isFormed={isFormed} />
      
      <SnowGround />

      <ContactShadows position={[0, -3.49, 0]} resolution={1024} scale={30} blur={2.5} opacity={0.6} far={10} color="#000000" />

      <Environment preset="city" background={false} environmentIntensity={0.8} />

      <OrbitControls 
        autoRotate={autoRotate}
        autoRotateSpeed={rotationSpeed}
        enablePan={false} 
        minPolarAngle={Math.PI / 4} 
        maxPolarAngle={Math.PI / 1.9}
        minDistance={8}
        maxDistance={30}
      />

      <EffectComposer multisampling={0}>
        <SMAA />
        <N8AO 
            aoRadius={1} 
            intensity={2} 
            screenSpaceRadius={false}
            halfRes
            color="black"
        />
        <Bloom 
            luminanceThreshold={isLightsOn ? 1 : 2} 
            mipmapBlur 
            intensity={isLightsOn ? 1.5 : 0.5} 
            radius={0.6}
        />
        <Vignette eskil={false} offset={0.1} darkness={0.8} /> 
        <Noise opacity={0.02} />
      </EffectComposer>
    </Canvas>
  );
};