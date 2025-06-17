import { StyleSheet, TextInput, TextInputProps, View } from "react-native";
import { FontAwesome5 as Icon } from "@expo/vector-icons";
type LinkInputProps = TextInputProps & {
  placeholder: string;
};

export function LinkInput({ placeholder, ...props }: LinkInputProps) {
  return (
    <View style={styles.searchWrapper}>
      <Icon name="search" size={16} color="#FF6B3D" style={styles.searchIcon} />
      <TextInput
        placeholder={placeholder}
        placeholderTextColor="#8E8E93"
        style={styles.searchInput}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  searchWrapper: {
    marginTop: 24,
    backgroundColor: "#fff",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    shadowColor: "#FFB088",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1C1C1E",
  },
});
