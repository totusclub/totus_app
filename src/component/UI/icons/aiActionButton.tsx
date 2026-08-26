import React from 'react';
import Svg, { Circle, Path, Defs, LinearGradient, Stop } from "react-native-svg";

const AiActionButton = ({ size = 24, color = 'black' }) => {
    return (
        <Svg width={size} height={size} viewBox="0 0 36 36" fill="none">
            <Defs>
                <LinearGradient
                    id="paint0_linear_32_2993"
                    x1="3"
                    y1="2.5"
                    x2="29"
                    y2="40"
                    gradientUnits="userSpaceOnUse"
                >
                    <Stop offset="0" stopColor="#FFA97E" />
                    <Stop offset="1" stopColor="#FE732E" />
                </LinearGradient>
            </Defs>

            <Circle cx="18" cy="18" r="18" fill="url(#paint0_linear_32_2993)" />

            <Path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M22.1569 18.711L16.4999 24.368L15.0859 22.954L20.0359 18.004L15.0859 13.054L16.4999 11.64L22.1569 17.297C22.3444 17.4845 22.4497 17.7389 22.4497 18.004C22.4497 18.2692 22.3444 18.5235 22.1569 18.711Z"
                fill="white"
            />
        </Svg>

    );
};

export default AiActionButton;