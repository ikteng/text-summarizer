import { Link, Stack } from 'expo-router';
import { StyleSheet, View, Text } from 'react-native';
import { useColorScheme } from './hooks/useColorScheme';
import { Colors } from './constants/Colors';

export default function NotFoundScreen() {
  const colorScheme = useColorScheme();
  const color = Colors[colorScheme ?? 'light'];

  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={[styles.container, { backgroundColor: color.background }]}>
        <Text style={[styles.title, { color: color.text }]}>
          This screen does not exist.
        </Text>
        <Link href="/" style={styles.link}>
          <Text style={[styles.linkText, { color: color.tint }]}>
            Go to home screen!
          </Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 18,
    fontWeight: '600',
  },
});
