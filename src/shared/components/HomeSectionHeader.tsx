import {StyleSheet, TouchableOpacity, View, Text} from "react-native";
import React from "react";

export function HomeSectionHeader({title, onPress}: { title: string; onPress?: () => void;
}) {
    return (
        <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            {onPress && (
                <TouchableOpacity onPress={onPress}>
                    <Text style={styles.viewAll}>전체 보기</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        marginTop: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    viewAll: {
        fontSize: 14,
        color: '#888',
    },
});
