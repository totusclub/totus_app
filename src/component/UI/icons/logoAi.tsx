import React from 'react';
import Svg, {
    Defs,
    LinearGradient,
    Stop,
    Circle,
    Path,
    Mask,
    G,
} from "react-native-svg"

const LogoAiIcon = ({ size = 24, color = 'white' }) => {
    return (
        <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            <Defs>
                <LinearGradient
                    id="paint0_linear_32_2764"
                    x1="-20.1297"
                    y1="14.6245"
                    x2="3.66577"
                    y2="51.9923"
                    gradientUnits="userSpaceOnUse"
                >
                    <Stop offset="0" stopColor="#FE732E" />
                    <Stop offset="1" stopColor="#FFAF87" />
                </LinearGradient>

                <LinearGradient
                    id="paint1_linear_32_2764"
                    x1="-20.1297"
                    y1="14.6245"
                    x2="3.66577"
                    y2="51.9923"
                    gradientUnits="userSpaceOnUse"
                >
                    <Stop offset="0" stopColor="#FE732E" />
                    <Stop offset="1" stopColor="#FFAF87" />
                </LinearGradient>

                <Mask
                    id="mask0_32_2764"
                    maskUnits="userSpaceOnUse"
                    x="0"
                    y="0"
                    width="32"
                    height="32"
                    maskType="alpha"
                >
                    <Circle cx="16" cy="16" r="16" fill="url(#paint0_linear_32_2764)" />
                </Mask>
            </Defs>

            <G mask="url(#mask0_32_2764)">
                <Circle cx="16" cy="16" r="16" fill="url(#paint1_linear_32_2764)" />

                <Path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M36.9999 13.9011C30.4229 13.9011 25.0913 8.56942 25.0913 1.99243C25.0913 8.56942 19.7596 13.9011 13.1826 13.9011C19.7596 13.9011 25.0913 19.2327 25.0913 25.8097C25.0913 19.2327 30.4229 13.9011 36.9999 13.9011Z"
                    fill="white"
                    fillOpacity={0.3}
                />

                <Path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M14.1996 3.35079C11.2444 3.35079 8.84883 0.955165 8.84883 -2C8.84883 0.955165 6.45321 3.35079 3.49805 3.35079C6.45321 3.35079 8.84883 5.7464 8.84883 8.70157C8.84883 5.7464 11.2444 3.35079 14.1996 3.35079Z"
                    fill="white"
                    fillOpacity={0.7}
                />

                <Path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M15.8647 26.7795C13.9691 26.7795 12.4324 25.2428 12.4324 23.3472C12.4324 25.2428 10.8956 26.7795 9 26.7795C10.8956 26.7795 12.4324 28.3162 12.4324 30.2119C12.4324 28.3162 13.9691 26.7795 15.8647 26.7795Z"
                    fill="white"
                />

                <Path
                    d="M6.65187 21L11.3887 8.4875H13.5338L18.2706 21H15.9826L14.928 18.1757H9.8515L8.79688 21H6.65187ZM10.5486 16.3167H14.2309L12.4076 11.1687L10.5486 16.3167ZM20.4994 21V8.4875H22.6444V21H20.4994Z"
                    fill="#1F1F1F"
                />

                <Path
                    d="M6.65187 21L11.3887 8.4875H13.5338L18.2706 21H15.9826L14.928 18.1757H9.8515L8.79688 21H6.65187ZM10.5486 16.3167H14.2309L12.4076 11.1687L10.5486 16.3167ZM20.4994 21V8.4875H22.6444V21H20.4994Z"
                    fill="white"
                />
            </G>
        </Svg>

    );
};

export default LogoAiIcon;