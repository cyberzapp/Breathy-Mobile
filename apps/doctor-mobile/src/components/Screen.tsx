import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { useSafeAreaInsets, SafeAreaProvider } from 'react-native-safe-area-context';

interface ScreenProps extends ViewProps {
    children: React.ReactNode;
    disableBottomSafeArea?: boolean;
    isModal?: boolean; // Added this prop
}

// 1. Extract the core logic into an internal component
const ScreenContent = ({ children, style, disableBottomSafeArea = false, ...rest }: Omit<ScreenProps, 'isModal'>) => {
    const insets = useSafeAreaInsets();

    // Calculate the padding once for the whole app
    const paddingBottom = disableBottomSafeArea ? 0 : Math.max(insets.bottom, 16);

    return (
        <View
            style={[
                styles.container,
                { paddingBottom },
                style
            ]}
            {...rest}
        >
            {children}
        </View>
    );
};

// 2. Export the wrapper that handles the Modal context
export const Screen = ({ isModal = false, ...props }: ScreenProps) => {
    if (isModal) {
        return (
            // A new provider is required because native Modals escape the root provider
            <SafeAreaProvider>
                <ScreenContent {...props} />
            </SafeAreaProvider>
        );
    }

    return <ScreenContent {...props} />;
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
});