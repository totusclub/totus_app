import React from 'react';
import { Dimensions } from 'react-native';
import Svg, { Rect, Path, Defs, LinearGradient, Stop, Mask, G } from 'react-native-svg';

type LoyaltyCardBackgroundProps = {
  width?: string | number;
  height?: string | number;
  containerHeight?: number;
};

const LoyaltyCardBackground = ({ width, height, containerHeight }: LoyaltyCardBackgroundProps) => {
  const screenWidth = Dimensions.get('window').width;
  const containerWidth = screenWidth - 16; // Account for padding (8px on each side)
  const calculatedWidth = width === '100%' ? containerWidth : (typeof width === 'number' ? width : containerWidth);
  // Use containerHeight if provided, otherwise calculate based on aspect ratio
  const calculatedHeight = containerHeight || (height === '100%' ? Math.max(240, (calculatedWidth * 220) / 359) : (typeof height === 'number' ? height : 240));

  return (
    <Svg width={calculatedWidth} height={calculatedHeight} viewBox="0 0 359 220" fill="none" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="paint0_linear_82_8028" x1="179.5" y1="0" x2="179.5" y2="220" gradientUnits="userSpaceOnUse">
          <Stop stopColor="#FF560E" />
          <Stop offset="1" stopColor="#FF831D" />
        </LinearGradient>
        <LinearGradient id="paint1_linear_82_8028" x1="316.5" y1="179.463" x2="316.5" y2="194.187" gradientUnits="userSpaceOnUse">
          <Stop stopColor="white" stopOpacity="0.2" />
          <Stop offset="1" stopColor="white" stopOpacity="0" />
        </LinearGradient>
        <LinearGradient id="paint2_linear_82_8028" x1="79.5" y1="61.4373" x2="79.5" y2="233.108" gradientUnits="userSpaceOnUse">
          <Stop stopColor="white" stopOpacity="0.2" />
          <Stop offset="1" stopColor="white" stopOpacity="0" />
        </LinearGradient>
        <Mask id="mask0_82_8028" maskUnits="userSpaceOnUse" x="0" y="0" width="359" height="220">
          <Rect width="359" height="220" rx="22" fill="white" />
        </Mask>
      </Defs>
      <Rect x="0.736185" y="0.736185" width="357.528" height="218.528" rx="21.3494" fill="#FF560E" stroke="url(#paint0_linear_82_8028)" strokeWidth="1.47237" />
      <G mask="url(#mask0_82_8028)">
        <Path
          d="M216.266 179.412C175.668 241.172 183.117 326.357 232.904 369.671C282.69 412.985 355.968 398.03 396.566 336.271C437.164 274.511 429.714 189.325 379.928 146.012C330.141 102.698 256.864 117.653 216.266 179.412ZM363.478 307.485C351.137 326.258 333.29 339.032 313.863 342.997C294.435 346.961 275.019 341.792 259.885 328.626C244.751 315.46 235.14 295.375 233.165 272.791C231.19 250.206 237.013 226.972 249.354 208.198C261.694 189.425 279.542 176.651 298.969 172.686C318.396 168.722 337.813 173.891 352.946 187.057C368.08 200.223 377.692 220.308 379.667 242.892C381.642 265.477 375.818 288.711 363.478 307.485Z"
          fill="url(#paint1_linear_82_8028)"
          fillOpacity="0.2"
        />
        <Path
          d="M28.6048 11.6649C-40.4742 46.2758 -73.4926 135.052 -45.1405 209.943C-16.7883 284.834 62.2019 317.491 131.281 282.88C200.36 248.269 233.378 159.493 205.026 84.6015C176.674 9.71036 97.6838 -22.946 28.6048 11.6649ZM112.438 233.108C91.44 243.628 67.8783 244.675 46.9363 236.017C25.9943 227.359 9.38752 209.706 0.769232 186.941C-7.84905 164.176 -7.77287 138.164 0.981014 114.628C9.7349 91.0913 26.4494 71.9581 47.4475 61.4373C68.4457 50.9165 92.0075 49.87 112.949 58.5279C133.891 67.1857 150.498 84.8389 159.116 107.604C167.735 130.369 167.659 156.38 158.905 179.917C150.151 203.454 133.436 222.587 112.438 233.108Z"
          fill="url(#paint2_linear_82_8028)"
          fillOpacity="0.2"
        />
      </G>
    </Svg>
  );
};

export default LoyaltyCardBackground;

