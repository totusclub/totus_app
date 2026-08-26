import React from 'react';
import Svg, { Path, Ellipse, Circle } from 'react-native-svg';

const GotoShopIcon = ({ size = 24, color = 'black' }) => {
    return (
        <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
            <Path
                d="M2.5 8.33301V14.6663C2.5 15.7709 3.39543 16.6663 4.5 16.6663H10M2.5 8.33301V5.33301C2.5 4.22844 3.39543 3.33301 4.5 3.33301H15.5C16.6046 3.33301 17.5 4.22844 17.5 5.33301V8.33301M2.5 8.33301H17.5M17.5 8.33301V10.833"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <Path
                d="M14.5834 17.5L14.5834 12.5M14.5834 12.5L16.6667 14.5833M14.5834 12.5L12.5001 14.5833"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <Ellipse
                cx="5.00008"
                cy="5.83333"
                rx="0.833333"
                ry="0.833333"
                fill={color}
            />
            <Circle
                cx="7.50008"
                cy="5.83333"
                r="0.833333"
                fill={color}
            />
        </Svg>
    );
};

export default GotoShopIcon;
