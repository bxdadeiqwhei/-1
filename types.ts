export interface AppState {
  isLightsOn: boolean;
  rotationSpeed: number;
  autoRotate: boolean;
  isFormed: boolean;
  toggleLights: () => void;
  setRotationSpeed: (speed: number) => void;
  toggleAutoRotate: () => void;
  toggleForm: () => void;
}

export type ThemeColors = {
  primary: string;
  secondary: string;
  accent: string;
};

// Augment the global JSX namespace to allow any intrinsic element.
// This resolves issues where extending ThreeElements caused standard HTML elements to be lost
// or where ThreeElements elements were not properly recognized.
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
    interface IntrinsicAttributes {
      key?: any;
    }
  }
}