declare module '@dqbd/tiktoken' {
  export type Tiktoken = {
    encode: (text: string) => number[];
    free?: () => void;
  };

  export function encoding_for_model(model: string): Tiktoken;
  export function get_encoding(name: string): Tiktoken;
}

