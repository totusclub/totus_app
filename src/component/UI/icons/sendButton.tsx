import React from 'react';
import Svg, {Circle, Defs, LinearGradient, Path, Stop} from 'react-native-svg';

const SendButtonIcon = ({size = 24, color = 'black'}) => {
    return (
        <Svg width={size} height={size} viewBox="0 0 36 36" fill="none">
            <Defs>
                <LinearGradient
                    id="paint0_linear_21_7010"
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

            <Circle
                cx="18"
                cy="18"
                r="18"
                fill="url(#paint0_linear_21_7010)"
            />

            <Path
                d="M19 18.6667V17.3334H14.8133L13 11.3334L25.6667 18L13 24.6667L14.8 18.6667H19Z"
                fill="white"
            />
        </Svg>

    );
};

export default SendButtonIcon;
