import React, { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../hooks/useTheme';
import { useHasBottomTabBar } from '../../../hooks/useHasBottomTabBar';

interface ContentProps {
    children: ReactNode;
    /** Override auto-detection when needed */
    hasBottomTabBar?: boolean;
}

const Content: React.FC<ContentProps> = ({ children, hasBottomTabBar: override }) => {
    const { theme } = useTheme();
    const detectedHasBottomTabBar = useHasBottomTabBar();
    const hasBottomTabBar = override ?? detectedHasBottomTabBar;

    return (
        <>
            {/* <StatusBar barStyle={theme.statusBar} backgroundColor={theme.statusBarBackground} /> */}
            <SafeAreaView
                edges={hasBottomTabBar ? ['top', 'bottom'] : ['top']}
                style={[
                    styles.container,
                    { backgroundColor: theme.background },
                    !hasBottomTabBar && styles.containerWithoutTabBar,
                ]}>
                {children}
            </SafeAreaView>
        </>
    );
};

export default Content;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        marginBottom: 12,
    },
    containerWithoutTabBar: {
        marginBottom: 0,
    },
});
