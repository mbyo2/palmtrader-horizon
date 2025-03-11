
// Adding form data to the window object for communication between components
declare global {
  interface Window {
    formData?: {
      orderType: string;
      shares: number;
      limitPrice: number | null;
      stopPrice: number | null;
      isFractional: boolean;
    };
  }
}

export {};
