import { Float, OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GoTriangleDown } from 'react-icons/go';
import { MdCancel } from 'react-icons/md';
import * as THREE from 'three';
import { fetch_chunk, fetch_vectors } from '@/app/api';
import type {
  ChunkPayload,
  ChunkScore,
  Credentials,
  VectorGroup,
  VectorsPayload,
  VerbaChunk,
  VerbaVector,
} from '@/app/types';
import { colors, vectorToRGB } from './util';

const Sphere: React.FC<{
  vector: VerbaVector;
  color: string;
  setHoverTitle: React.MutableRefObject<(t: string | null) => void>;
  documentTitle: string;
  multiplication: number;
  dynamicColor: boolean;
  chunk_id: string;
  chunk_uuid: string;
  setSelectedChunk: (c: string) => void;
  selectedChunk: string | null;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  chunkScores?: ChunkScore[];
}> = ({
  vector,
  color,
  setHoverTitle,
  documentTitle,
  multiplication,
  dynamicColor,
  chunk_id,
  chunk_uuid,
  setSelectedChunk,
  selectedChunk,
  minX,
  maxX,
  minY,
  maxY,
  minZ,
  maxZ,
  chunkScores,
}) => {
  const ref = useRef<THREE.Mesh | null>(null);
  const hoverRef = useRef(false);

  const isHighlighted = useMemo(
    () => chunkScores?.some((score) => score.uuid === chunk_uuid),
    [chunkScores, chunk_uuid]
  );

  const sphereColor = useMemo(() => {
    if (isHighlighted) {
      return new THREE.Color('yellow');
    }
    if (selectedChunk === chunk_uuid) {
      return new THREE.Color('green');
    }
    if (dynamicColor) {
      return dynamicColor
        ? (() => {
            const [r, g, b] = vectorToRGB(
              vector,
              minX,
              maxX,
              minY,
              maxY,
              minZ,
              maxZ
            );
            // THREE.Color expects values in the range [0,1]
            return new THREE.Color(r / 255, g / 255, b / 255);
          })()
        : new THREE.Color(color);
    }
    return new THREE.Color(color);
  }, [
    isHighlighted,
    selectedChunk,
    chunk_uuid,
    dynamicColor,
    color,
    vector,
    minX,
    maxX,
    minY,
    maxY,
    minZ,
    maxZ,
  ]);

  const sphereRadius = isHighlighted
    ? 3
    : selectedChunk === chunk_uuid
      ? 1.5
      : 1;
  const sphereOpacity = isHighlighted ? 1 : hoverRef.current ? 1 : 0.5;

  const handlePointerEnter = useCallback(() => {
    hoverRef.current = true;
    setHoverTitle.current(`${documentTitle} | ${chunk_id}`);
  }, [documentTitle, chunk_id, setHoverTitle]);

  const handlePointerLeave = useCallback(() => {
    hoverRef.current = false;
    setHoverTitle.current(null);
  }, [setHoverTitle]);

  const handleClick = useCallback(() => {
    setSelectedChunk(chunk_uuid);
  }, [chunk_uuid, setSelectedChunk]);

  useFrame(() => {
    if (ref.current) {
      ref.current.position.lerp(
        new THREE.Vector3(
          vector.x * multiplication,
          vector.y * multiplication,
          vector.z * multiplication
        ),
        0.02
      );

      // Update material color based on hover state
      const material = ref.current.material as THREE.MeshBasicMaterial;
      material.color.set(hoverRef.current ? 'blue' : sphereColor);
      material.opacity = hoverRef.current ? 1 : sphereOpacity;
      material.transparent = !hoverRef.current;
    }
  });

  return (
    <Float rotationIntensity={0.2}>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: react-three-fiber mesh uses pointer events and is not a DOM element */}
      <mesh
        onClick={handleClick}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        position={[0, 0, 0]}
        ref={ref}
      >
        <sphereGeometry args={[sphereRadius, 32, 32]} />
        <meshBasicMaterial
          color={sphereColor}
          opacity={sphereOpacity}
          transparent={true}
        />
      </mesh>
    </Float>
  );
};

type VectorViewProps = {
  credentials: Credentials;
  selectedDocument: string | null;
  chunkScores?: ChunkScore[];
  production: 'Local' | 'Demo' | 'Production';
};

const VectorView: React.FC<VectorViewProps> = ({
  credentials,
  selectedDocument,
  production,
  chunkScores,
}) => {
  // Removed unused refs variable
  const [isFetching, setIsFetching] = useState(false);
  const [vectors, setVectors] = useState<VectorGroup[]>([]);
  const [embedder, setEmbedder] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [dynamicColor, setDymanicColor] = useState(true);
  const [hoverTitleState, setHoverTitleState] = useState<string | null>(null);
  const hoverTitleRef = useRef<(t: string | null) => void>((t) =>
    setHoverTitleState(t)
  );
  const [viewMultiplication, setViewMultiplication] = useState(200);
  const [currentDimensions, setCurrentDimensions] = useState(0);

  const [selectedChunk, setSelectedChunk] = useState<null | string>(null);
  const [chunk, setChunk] = useState<VerbaChunk | null>(null);

  const [minX, setMinX] = useState(-1);
  const [maxX, setMaxX] = useState(1);

  const [minY, setMinY] = useState(-1);
  const [maxY, setMaxY] = useState(1);

  const [minZ, setMinZ] = useState(-1);
  const [maxZ, setMaxZ] = useState(1);

  const calculateMinMax = useCallback(
    (values: number[]): { min: number; max: number } => {
      const min = Math.min(...values);
      const max = Math.max(...values);
      return { min, max };
    },
    []
  );

  const getVectorCount = () => {
    let vector_count = 0;
    for (const vector_group of vectors) {
      vector_count += vector_group.chunks.length;
    }
    return vector_count;
  };

  const fetchChunk = useCallback(async () => {
    if (!selectedChunk) return;

    try {
      const data: ChunkPayload | null = await fetch_chunk(
        selectedChunk,
        embedder,
        credentials
      );

      if (data) {
        if (data.error !== '') {
          setChunk(null);
        } else {
          setChunk(data.chunk);
        }
      }
    } catch (_error) {
      setIsFetching(false);
    }
  }, [selectedChunk, embedder, credentials]);

  const fetchVectors = useCallback(async () => {
    try {
      setIsFetching(true);

      const data: VectorsPayload | null = await fetch_vectors(
        selectedDocument,
        showAll,
        credentials
      );

      if (data) {
        if (data.error !== '') {
          setIsFetching(false);
          setVectors([]);
          setCurrentDimensions(0);
          setEmbedder('None');
        } else {
          setVectors(data.vector_groups.groups);
          setEmbedder(data.vector_groups.embedder);
          setCurrentDimensions(data.vector_groups.dimensions);
          setIsFetching(false);

          if (!showAll && data.vector_groups.groups.length > 0) {
            const firstGroup = data.vector_groups.groups[0];
            if (firstGroup?.chunks && firstGroup.chunks.length > 0) {
              const xValues = firstGroup.chunks.map((v) => v.vector.x);
              const yValues = firstGroup.chunks.map((v) => v.vector.y);
              const zValues = firstGroup.chunks.map((v) => v.vector.z);

              const { min: _minX, max: _maxX } = calculateMinMax(xValues);
              setMinX(_minX);
              setMaxX(_maxX);

              const { min: _minY, max: _maxY } = calculateMinMax(yValues);
              setMinY(_minY);
              setMaxY(_maxY);

              const { min: _minZ, max: _maxZ } = calculateMinMax(zValues);
              setMinZ(_minZ);
              setMaxZ(_maxZ);
            }
          }
        }
      }
    } catch (_error) {
      setIsFetching(false);
    }
  }, [selectedDocument, showAll, credentials, calculateMinMax]);

  useEffect(() => {
    if (selectedDocument) {
      fetchVectors();
    } else {
      setVectors([]);
    }
  }, [selectedDocument, fetchVectors]);

  useEffect(() => {
    if (selectedChunk) {
      fetchChunk();
    } else {
      setChunk(null);
    }
  }, [selectedChunk, fetchChunk]);

  const selectColor = useCallback((index: number): string => {
    if (index >= colors.length) {
      const randomIndex = Math.floor(Math.random() * colors.length);
      return colors[randomIndex] ?? '#000000';
    }
    return colors[index] ?? '#000000';
  }, []);

  return (
    <div className="flex h-full w-full flex-col gap-2">
      <div className="flex w-full items-center justify-end gap-2">
        <div className="flex w-full items-start justify-between">
          {/* Left */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              {isFetching && (
                <div className="flex h-full items-center justify-center gap-2 text-text-alt-verba">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-muted border-t-foreground" />
                </div>
              )}
              <p className="font-bold text-text-alt-verba text-xs lg:text-sm">
                Embedding Model:
              </p>
              <p className="text-text-alt-verba text-xs lg:text-sm">
                {embedder}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <p className="font-bold text-text-alt-verba text-xs lg:text-sm">
                Hover:
              </p>
              <p
                className="max-w-[100px] truncate text-text-alt-verba text-xs lg:max-w-[300px] lg:text-sm"
                title={hoverTitleState ?? ''}
              >
                {hoverTitleState ?? ''}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <p className="font-bold text-text-alt-verba text-xs lg:text-sm">
                Vectors:
              </p>
              <p className="text-text-alt-verba text-xs lg:text-sm">
                {vectors.length} x {getVectorCount()} x {currentDimensions}
              </p>
            </div>
          </div>

          <div className="flex min-w-[20vw] items-center justify-between gap-10">
            <div className="flex w-full flex-col gap-2">
              {production !== 'Demo' && (
                <div className="flex items-center justify-between gap-2">
                  <p className="text-text-alt-verba text-xs">
                    Show All Documents
                  </p>
                  <input
                    checked={showAll}
                    className="toggle"
                    onChange={(e) => {
                      setShowAll(e.target.checked);
                    }}
                    type="checkbox"
                  />
                </div>
              )}

              <div className="flex items-center justify-between gap-2">
                <p className="text-text-alt-verba text-xs">Dynamic Coloring</p>
                <input
                  checked={dynamicColor}
                  className="toggle"
                  onChange={(e) => {
                    setDymanicColor(e.target.checked);
                  }}
                  type="checkbox"
                />
              </div>
            </div>

            <div className="flex w-full flex-col gap-2">
              {/* Dropdown */}
              <div className="flex w-full items-center justify-start">
                <button
                  className="inline-flex items-center gap-2 rounded-md bg-button-verba px-3 py-1.5 text-sm text-text-verba hover:bg-button-hover-verba"
                  disabled
                  type="button"
                >
                  <GoTriangleDown size={15} />
                  <span>PCA</span>
                </button>
              </div>
              {/* Zoom */}
              <div className="flex w-full items-center gap-2">
                <p className="text-sm text-text-alt-verba">Zoom</p>
                <input
                  className="w-full grow appearance-none bg-transparent"
                  max="1000"
                  min={0}
                  onChange={(e) => {
                    setViewMultiplication(Number(e.target.value));
                  }}
                  type="range"
                  value={viewMultiplication}
                />
              </div>
            </div>

            {chunk && (
              <button
                className="inline-flex items-center justify-center rounded-md bg-button-verba p-2 text-text-verba hover:bg-warning-verba"
                onClick={() => {
                  setChunk(null);
                  setSelectedChunk(null);
                }}
                type="button"
              >
                <MdCancel size={15} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex h-[45vh] w-full gap-5">
        <div
          className={`flex grow transition-all duration-300 ease-in-out ${
            selectedChunk ? 'w-2/3' : 'w-full'
          } h-full`}
        >
          <Canvas>
            <ambientLight intensity={1} />
            <OrbitControls />
            <PerspectiveCamera makeDefault position={[0, 0, 0 + 150]} />
            <axesHelper args={[50]} />
            {vectors.map((vector_group, index) =>
              vector_group.chunks.map((chunk, v_index) => (
                <Sphere
                  chunk_id={chunk.chunk_id}
                  chunk_uuid={chunk.uuid}
                  chunkScores={chunkScores || []}
                  color={selectColor(index)}
                  documentTitle={vector_group.name}
                  dynamicColor={dynamicColor}
                  key={`Sphere_${v_index}${vector_group.name}`}
                  maxX={maxX}
                  maxY={maxY}
                  maxZ={maxZ}
                  minX={minX}
                  minY={minY}
                  minZ={minZ}
                  multiplication={viewMultiplication}
                  selectedChunk={selectedChunk}
                  setHoverTitle={hoverTitleRef}
                  setSelectedChunk={setSelectedChunk}
                  vector={chunk.vector}
                />
              ))
            )}
          </Canvas>
        </div>
        <div
          className={`flex grow transition-all duration-300 ease-in-out ${
            selectedChunk ? 'w-1/3 opacity-100' : 'w-0 opacity-0'
          } overflow-auto`}
        >
          {chunk && (
            <div className="flex w-full flex-col gap-2 p-3">
              <p className="fond-bold text-text-alt-verba">
                Chunk {chunk.chunk_id}
              </p>
              <p className="text-sm text-text-alt-verba">{chunk.content}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VectorView;
