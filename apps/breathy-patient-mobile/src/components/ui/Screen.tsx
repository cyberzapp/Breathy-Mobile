import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { useSafeAreaInsets, SafeAreaProvider } from 'react-native-safe-area-context';

interface ScreenProps extends ViewProps {
    children: React.ReactNode;
    disableBottomSafeArea?: boolean;
    isModal?: boolean;
}

const ScreenContent = ({ children, style, disableBottomSafeArea = false, ...rest }: Omit<ScreenProps, 'isModal'>) => {
    const insets = useSafeAreaInsets();
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

export const Screen = ({ isModal = false, ...props }: ScreenProps) => {
    if (isModal) {
        return (
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
