import { Plus } from 'lucide-react-native';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { INK } from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';

export default function CreateMenuButton() {
  const { openCreateMenu } = useApp();

  return (
    <TouchableOpacity
      onPress={openCreateMenu}
      style={styles.button}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      testID="open-create-menu"
    >
      <Plus size={22} color="#FFFFFF" strokeWidth={2.5} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    marginLeft: 16,
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: INK,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
