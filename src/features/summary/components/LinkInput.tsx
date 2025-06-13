import {StyleSheet, TextInput, TextInputProps} from "react-native";

type LinkInputProps = TextInputProps & {
    placeholder: string; // 필수로 받도록 설정
};

export function LinkInput({ placeholder, ...props }: LinkInputProps) {
    return (
        <TextInput
            placeholder={placeholder}
            style={styles.input}
            {...props}
        />
    );
}

const styles = StyleSheet.create({
    input: {
        marginTop: 16,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 12,
        padding: 12,
        fontSize: 14,
        backgroundColor: '#f9f9f9',
    },
})