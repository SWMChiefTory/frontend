import Animated, {interpolate, SharedValue, useAnimatedStyle} from "react-native-reanimated";
import React from "react";
import {StyleSheet, Text, View} from "react-native";
import {CookStep} from "@/src/features/recipe/cook/types/CookStep";

interface Props {
    item: CookStep;
    animationValue: SharedValue<number>;
}

export function CookStepCard({ item, animationValue }: Props) {

    const LIGHT_GRAY = "#4A4A4A";

    const overlayStyle = useAnimatedStyle(() => {
        const opacity = interpolate(animationValue.value, [-1, 0, 1], [0.6, 0, 0.6]);
        return { backgroundColor: LIGHT_GRAY, opacity };
    });

    return (
        <View style={styles.cardWrapper}>
            <View style={styles.page}>
                <Text style={styles.stepTitle}>Step {item.index}</Text>
                <Text style={styles.stepDescription}>{item.description}</Text>
            </View>
            <Animated.View
                pointerEvents="none"
                style={[styles.overlayFill, overlayStyle]}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    cardWrapper: {
        flex: 1,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 10,
    },

    page: {
        flex: 1,
        width: '100%',
        backgroundColor: '#F2F2F2',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
    },

    stepTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
    },

    stepDescription: {
        fontSize: 18,
        textAlign: 'center',
    },

    overlayFill: StyleSheet.absoluteFillObject,
});