import React from "react";
import { SpikeLandLogo } from "./SpikeLandLogo";
import { BridgeMindLogo } from "./BridgeMindLogo";
import { COLORS } from "../../lib/constants";

type LogoLockupProps = {
  size?: number;
  delay?: number;
};

export const LogoLockup: React.FC<LogoLockupProps> = ({ size = 80, delay = 0 }) => {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: size * 0.5,
      }}
    >
      <SpikeLandLogo size={size} delay={delay} showWordmark={false} />
      <div
        style={{
          fontSize: size * 0.6,
          fontWeight: 300,
          color: COLORS.textMuted,
        }}
      >
        +
      </div>
      <BridgeMindLogo size={size * 0.8} delay={delay + 10} />
    </div>
  );
};
