import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles, Extrude, Torus, Image } from '@react-three/drei';
import * as THREE from 'three';

// -- Palette based on Reference Image --
const PINE_COLOR = new THREE.Color("#0d2b1d"); // Deep, dark forest green
const RED_COLOR = new THREE.Color("#D40028"); // Vibrant Red
const SILVER_COLOR = new THREE.Color("#e2e8f0"); // Silver/White
const GOLD_COLOR = new THREE.Color("#FCD34D"); // Bright Gold
const WARM_LIGHT_COLOR = new THREE.Color("#fff7ed"); // Warm fairy light
const BERRY_COLOR = new THREE.Color("#991b1b"); // Deep red berries
const SNOW_COLOR = new THREE.Color("#ffffff");

const dummy = new THREE.Object3D();
const tempPos = new THREE.Vector3();

// -- Tree Dimensions (Unified Cone) --
const TREE_HEIGHT = 10.0;
const TREE_RADIUS = 4.8;
const TREE_Y_BASE = -3.5;

// -- Geometry Helpers --

const getRandomSpherePos = (r: number) => {
    const vector = new THREE.Vector3();
    const phi = Math.random() * Math.PI * 2;
    const costheta = Math.random() * 2 - 1;
    const u = Math.random();
    const theta = Math.acos(costheta);
    const R = r * Math.cbrt(u); 

    vector.set(
        R * Math.sin(theta) * Math.cos(phi),
        R * Math.sin(theta) * Math.sin(phi),
        R * Math.cos(theta)
    );
    return vector;
}

// Cone Equation: r(y) = R_base * (1 - (y - y_base)/height)
const getTreePoint = (surfaceOnly = false) => {
    const h = Math.pow(Math.random(), 1.5); // Bias towards bottom for volume, or linear for surface
    
    // Valid Y range: BASE to BASE + HEIGHT
    // We actually want density to be higher at bottom.
    // Let's pick a normalized height 'u' from 0 (base) to 1 (tip)
    const u = 1 - Math.sqrt(1 - Math.random()); // Cone distribution
    
    const yPos = TREE_Y_BASE + (u * TREE_HEIGHT);
    const maxR = TREE_RADIUS * (1 - u);
    
    // If surfaceOnly, push to outer 80-100% of radius
    const minThick = surfaceOnly ? 0.8 : 0.2;
    const thickness = minThick + (1 - minThick) * Math.random();
    
    const rCurrent = maxR * thickness;
    
    const angle = Math.random() * Math.PI * 2;
    const x = Math.cos(angle) * rCurrent;
    const z = Math.sin(angle) * rCurrent;
    
    const pos = new THREE.Vector3(x, yPos, z);
    
    // Normal / LookAt
    const lookAtPos = new THREE.Vector3(x * 2, yPos, z * 2);
    dummy.position.copy(pos);
    dummy.lookAt(lookAtPos);
    // Random rotation for foliage
    dummy.rotateX(Math.random() * Math.PI); 
    dummy.rotateY(Math.random() * Math.PI); 
    dummy.rotateZ(Math.random() * Math.PI); 
    const rot = new THREE.Quaternion().copy(dummy.quaternion);

    return { pos, rot, u }; // u is normalized height (0-1)
}

// Helper to generate points that don't overlap
// Used for Ornaments
const generateNonOverlappingPoints = (count: number, minDistance: number) => {
    const points: { pos: THREE.Vector3, rot: THREE.Quaternion, scale: number }[] = [];
    const maxAttempts = count * 50;
    
    for(let i = 0; i < maxAttempts; i++) {
        if (points.length >= count) break;
        
        // Generate candidate
        const { pos, rot, u } = getTreePoint(true);
        // Push slightly inward so it looks attached to branch, not floating
        // But for surface=true we are already at max radius approx.
        // Let's adjust slightly based on radius
        
        let valid = true;
        for (const p of points) {
            if (pos.distanceTo(p.pos) < minDistance) {
                valid = false;
                break;
            }
        }
        
        if (valid) {
            // Scale ornaments smaller at the top
            const scaleFactor = 1.0 - (u * 0.5); // 1.0 at bottom, 0.5 at top
            points.push({ pos, rot, scale: scaleFactor });
        }
    }
    return points;
}


// -- Instanced Components --

// Generic Hook for Morphing Instances
const useMorphingInstances = (
    count: number, 
    isFormed: boolean, 
    // We pass a pre-calculated array of targets instead of a function
    targetPoints: { pos: THREE.Vector3, rot: THREE.Quaternion, scale?: number }[] 
) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const { positions, rotations, scales, scatterPositions, scatterRotations } = useMemo(() => {
        // Use the actual count of generated points (might be less than requested if packing is tight)
        const actualCount = targetPoints.length;
        
        const positions = new Float32Array(actualCount * 3);
        const rotations = new Float32Array(actualCount * 4);
        const scales = new Float32Array(actualCount);
        const scatterPositions = new Float32Array(actualCount * 3);
        const scatterRotations = new Float32Array(actualCount * 4);

        for (let i = 0; i < actualCount; i++) {
            const { pos, rot, scale } = targetPoints[i];
            positions[i * 3] = pos.x;
            positions[i * 3 + 1] = pos.y;
            positions[i * 3 + 2] = pos.z;
            rotations[i * 4] = rot.x;
            rotations[i * 4 + 1] = rot.y;
            rotations[i * 4 + 2] = rot.z;
            rotations[i * 4 + 3] = rot.w;
            scales[i] = scale ?? 1;

            const sPos = getRandomSpherePos(10); // Wider scatter for larger tree
            scatterPositions[i * 3] = sPos.x;
            scatterPositions[i * 3 + 1] = sPos.y;
            scatterPositions[i * 3 + 2] = sPos.z;

            const sRot = new THREE.Quaternion().random();
            scatterRotations[i * 4] = sRot.x;
            scatterRotations[i * 4 + 1] = sRot.y;
            scatterRotations[i * 4 + 2] = sRot.z;
            scatterRotations[i * 4 + 3] = sRot.w;
        }
        return { positions, rotations, scales, scatterPositions, scatterRotations, actualCount };
    }, [targetPoints]);

    const lerpVal = useRef(isFormed ? 1 : 0);

    useFrame((state, delta) => {
        if (!meshRef.current) return;
        const target = isFormed ? 1 : 0;
        lerpVal.current = THREE.MathUtils.damp(lerpVal.current, target, 2, delta);
        const t = lerpVal.current;
        const ease = t * t * (3 - 2 * t);
        const time = state.clock.elapsedTime;
        const actualCount = targetPoints.length;

        for (let i = 0; i < actualCount; i++) {
            tempPos.set(scatterPositions[i*3], scatterPositions[i*3+1], scatterPositions[i*3+2])
                .lerp(new THREE.Vector3(positions[i*3], positions[i*3+1], positions[i*3+2]), ease);
            
             if (t > 0.1) {
                const y = positions[i*3+1];
                // Wind effect
                const windForce = 0.03 * Math.max(0, (y - TREE_Y_BASE) / TREE_HEIGHT) * t;
                const windX = (Math.sin(time * 0.8 + y) + Math.sin(time * 0.5 + positions[i*3])) * windForce;
                const windZ = (Math.cos(time * 0.7 + y) + Math.sin(time * 0.3 + positions[i*3+2])) * windForce;
                tempPos.x += windX;
                tempPos.z += windZ;
            }

            if (t < 0.99) {
                 tempPos.y += Math.sin(time * 2 + i) * 0.05 * (1 - t);
            }

            const q1 = new THREE.Quaternion(scatterRotations[i*4], scatterRotations[i*4+1], scatterRotations[i*4+2], scatterRotations[i*4+3]);
            const q2 = new THREE.Quaternion(rotations[i*4], rotations[i*4+1], rotations[i*4+2], rotations[i*4+3]);
            q1.slerp(q2, ease);

            dummy.position.copy(tempPos);
            dummy.quaternion.copy(q1);
            dummy.scale.setScalar(scales[i]);
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    return meshRef;
};

// -- TREE COMPONENTS --

const MorphingFoliage = ({ count = 15000, isFormed }: { count?: number, isFormed: boolean }) => {
    // Foliage doesn't need strict overlap checks, randomness is good for density
    const points = useMemo(() => {
        const arr = [];
        for(let i=0; i<count; i++) {
            const { pos, rot } = getTreePoint(false);
            const scale = 0.6 + Math.random() * 0.6;
            arr.push({ pos, rot, scale });
        }
        return arr;
    }, [count]);

    const meshRef = useMorphingInstances(count, isFormed, points);

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, points.length]} castShadow receiveShadow>
            <tetrahedronGeometry args={[0.08, 0]} />
            <meshStandardMaterial 
                color={PINE_COLOR} 
                roughness={0.8} 
                metalness={0.0}
            />
        </instancedMesh>
    );
};

// Generic component for spheres/baubles
const OrnamentLayer = ({ 
    count, 
    isFormed, 
    color, 
    minDist, 
    baseScale,
    roughness = 0.1,
    metalness = 0.5,
    emissiveIntensity = 0 
}: any) => {
    const points = useMemo(() => {
        const pts = generateNonOverlappingPoints(count, minDist);
        return pts.map(p => ({
            ...p,
            scale: p.scale * (baseScale + Math.random() * (baseScale * 0.5))
        }));
    }, [count, minDist, baseScale]);

    const meshRef = useMorphingInstances(count, isFormed, points);

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, points.length]} castShadow>
            <sphereGeometry args={[1, 32, 32]} />
            <meshPhysicalMaterial 
                color={color} 
                roughness={roughness} 
                metalness={metalness} 
                clearcoat={1}
                clearcoatRoughness={0.1}
                emissive={color}
                emissiveIntensity={emissiveIntensity}
            />
        </instancedMesh>
    );
};

const MorphingSnowTips = ({ isFormed }: { isFormed: boolean }) => {
    const count = 4000;
    const points = useMemo(() => {
        const arr = [];
        for(let i=0; i<count; i++) {
            const { pos, rot } = getTreePoint(true);
            pos.y += 0.05; // Sit on top
            const scale = 0.04 + Math.random() * 0.08;
            arr.push({ pos, rot, scale });
        }
        return arr;
    }, [count]);

    const meshRef = useMorphingInstances(count, isFormed, points);

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, points.length]}>
            <sphereGeometry args={[1, 8, 8]} />
            <meshStandardMaterial 
                color={SNOW_COLOR} 
                roughness={0.9} 
                metalness={0.0} 
            />
        </instancedMesh>
    );
};

const MorphingTopStar = ({ isFormed }: { isFormed: boolean }) => {
    const starShape = useMemo(() => {
        const shape = new THREE.Shape();
        const outerRadius = 1;
        const innerRadius = 0.4;
        const spikes = 5;
        for (let i = 0; i < spikes * 2; i++) {
            const r = (i % 2 === 0) ? outerRadius : innerRadius;
            const a = (i / (spikes * 2)) * Math.PI * 2;
            const x = Math.cos(a) * r;
            const y = Math.sin(a) * r;
            if (i === 0) shape.moveTo(x, y);
            else shape.lineTo(x, y);
        }
        shape.closePath();
        return shape;
    }, []);

    const points = useMemo(() => [{
        pos: new THREE.Vector3(0, TREE_Y_BASE + TREE_HEIGHT + 0.2, 0),
        rot: new THREE.Quaternion(),
        scale: 1.0
    }], []);

    const meshRef = useMorphingInstances(1, isFormed, points);

    return (
        <group>
            <instancedMesh ref={meshRef} args={[undefined, undefined, 1]}>
                <extrudeGeometry args={[starShape, { depth: 0.4, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1, bevelSegments: 3 }]} />
                <meshStandardMaterial 
                    color={GOLD_COLOR} 
                    emissive={GOLD_COLOR}
                    emissiveIntensity={2}
                    roughness={0.2}
                    metalness={1} 
                />
            </instancedMesh>
            {isFormed && <pointLight position={[0, TREE_Y_BASE + TREE_HEIGHT, 0]} intensity={5} distance={8} color={GOLD_COLOR} decay={2} />}
        </group>
    );
};

const Trunk = ({ isFormed }: { isFormed: boolean }) => {
    const ref = useRef<THREE.Group>(null);
    useFrame((state, delta) => {
        if (ref.current) {
            const targetY = isFormed ? 0 : -15;
            const targetScale = isFormed ? 1 : 0;
            ref.current.position.y = THREE.MathUtils.lerp(ref.current.position.y, targetY, delta * 2);
            ref.current.scale.setScalar(THREE.MathUtils.lerp(ref.current.scale.x, targetScale, delta * 2));
        }
    });

    return (
        <group ref={ref}>
            {/* Base Trunk - Scaled for large tree */}
            <mesh position={[0, TREE_Y_BASE + 1, 0]} receiveShadow castShadow>
                <cylinderGeometry args={[0.8, 1.5, 3, 16]} />
                <meshStandardMaterial color="#3e2723" roughness={1.0} />
            </mesh>
             {/* Central Spine */}
             <mesh position={[0, TREE_Y_BASE + (TREE_HEIGHT/2), 0]}>
                <cylinderGeometry args={[0.2, 0.8, TREE_HEIGHT, 8]} />
                <meshStandardMaterial color="#3e2723" />
            </mesh>
        </group>
    );
};


// -- Main Composition --

export const ChristmasTree = ({ isLightsOn, isFormed }: { isLightsOn: boolean, isFormed: boolean }) => {
    const groupRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (groupRef.current && isFormed) {
             groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.05;
        }
    });

    return (
        <group ref={groupRef} position={[0, 0, 0]}>
            <Trunk isFormed={isFormed} />
            <MorphingFoliage count={15000} isFormed={isFormed} />
            <MorphingSnowTips isFormed={isFormed} />
            
            {/* Ornaments - Using minimal overlapping logic */}
            {/* Large Red Baubles */}
            <OrnamentLayer 
                count={150} 
                isFormed={isFormed} 
                color={RED_COLOR} 
                minDist={0.6} 
                baseScale={0.25} 
            />
            {/* Silver Baubles */}
            <OrnamentLayer 
                count={120} 
                isFormed={isFormed} 
                color={SILVER_COLOR} 
                minDist={0.5} 
                baseScale={0.2} 
                metalness={0.9}
            />
            {/* Gold Baubles */}
            <OrnamentLayer 
                count={100} 
                isFormed={isFormed} 
                color={GOLD_COLOR} 
                minDist={0.5} 
                baseScale={0.18} 
            />
            {/* Berry Clusters */}
            <OrnamentLayer 
                count={400} 
                isFormed={isFormed} 
                color={BERRY_COLOR} 
                minDist={0.3} 
                baseScale={0.06} 
                roughness={0.5}
                metalness={0}
            />
            
            {/* Fairy Lights */}
            {isLightsOn && (
                <OrnamentLayer 
                    count={600} 
                    isFormed={isFormed} 
                    color={WARM_LIGHT_COLOR} 
                    minDist={0.15} 
                    baseScale={0.05} 
                    roughness={0}
                    emissiveIntensity={3}
                    metalness={0}
                />
            )}
            
            <MorphingTopStar isFormed={isFormed} />
        </group>
    );
};