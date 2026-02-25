declare module "react-split-flap-effect" {
  import * as React from "react";

  export type FlapDisplayProps = React.HTMLAttributes<HTMLDivElement> & {
    value: string | number;
    chars?: string;
    words?: string[];
    length?: number;
    padChar?: string;
    padMode?: "auto" | "start" | "end";
    timing?: number;
    hinge?: boolean;
    render?: (props: {
      id?: string;
      className?: string;
      css?: React.CSSProperties;
      children: React.ReactNode;
    }) => React.ReactNode;
  };

  export const FlapDisplay: React.ComponentType<FlapDisplayProps>;
  export const Presets: {
    NUM: string;
    ALPHANUM: string;
  };
}
