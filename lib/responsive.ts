import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Simple responsive layout hook based on screen height and safe area insets.
 * Tuned for portrait phones (small → tall devices).
 */
export function useResponsiveLayout() {
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isSmallHeight = height < 700;
  const isMediumHeight = height >= 700 && height < 850;
  const isLargeHeight = height >= 850;

  // Very light vertical scaling helper – keeps values reasonable across devices.
  const verticalScale = (value: number) => {
    const baseHeight = 812; // iPhone 11/12/13 baseline
    return Math.round((value * height) / baseHeight);
  };

  return {
    width,
    height,
    insets,
    isSmallHeight,
    isMediumHeight,
    isLargeHeight,
    verticalScale,
  };
}


