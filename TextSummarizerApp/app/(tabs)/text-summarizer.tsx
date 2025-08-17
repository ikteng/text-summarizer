import React, { useState } from 'react';
import { Client, handle_file } from "@gradio/client";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { Colors } from '../constants/Colors';
import { useColorScheme } from '../hooks/useColorScheme';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';

interface Summary {
  id: string;
  title: string;
  original_text: string;
  summary: string;
  status: 'pending' | 'done' | 'error';
}

interface SummaryRecordProps {
  id: string;
  title: string;
  original: string;
  summary: string;
  status: 'pending' | 'done' | 'error';
  onDelete: (id: string) => void;
  onReload: (id: string) => void;
  colors: typeof Colors.light | typeof Colors.dark;
}

export default function App() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];

  const [inputText, setInputText] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [status, setStatus] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState<boolean>(false);

  // Convert ArrayBuffer to base64
  const base64Encode = (arrayBuffer: ArrayBuffer): string => {
    let binary = '';
    const bytes = new Uint8Array(arrayBuffer);
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    return globalThis.btoa(binary);
  };

  // Web download helper
  const downloadTextFile = (filename: string, content: string) => {
    if (Platform.OS === 'web') {
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      saveAndShareText(filename, content);
    }
  };

  // Mobile save & share helper
  const saveAndShareText = async (filename: string, content: string) => {
    try {
      const path = FileSystem.cacheDirectory + filename;
      await FileSystem.writeAsStringAsync(path, content, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(path);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to save or share the file.');
    }
  };

  const handleFile = async () => {
    try {
      setIsExtracting(true);
      setStatus("Picking file...");

      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.txt, .docx, .pdf';
        input.onchange = async (e) => {
          const files = (e.target as HTMLInputElement).files;
          if (!files || files.length === 0) return;
          const file = files[0];
          setFileName(file.name);
          setStatus(`File selected: ${file.name}`);

          if (file.type === 'text/plain') {
            const text = await file.text();
            setInputText(text);
            setStatus("Text loaded from .txt file");
            setIsExtracting(false);
            return;
          }

          setStatus("Processing file...");
          const tempFile = await handle_file(file);

          let arrayBuffer: ArrayBuffer;
          if ("arrayBuffer" in tempFile) {
            arrayBuffer = await tempFile.arrayBuffer();
          } else if ("data" in tempFile) {
            arrayBuffer = tempFile.data;
          } else {
            throw new Error("Unknown file type returned by handle_file");
          }

          const base64Data = base64Encode(arrayBuffer);
          const fileData = { name: file.name, data: base64Data };

          setStatus("Connecting to server...");
          const client = await Client.connect("ikteng/text-summarizer");
          setStatus("Uploading file...");
          const result = await client.predict("/predict_1", { file: fileData });

          setInputText(result.data as string);
          setStatus("Text extraction complete");
          setIsExtracting(false);
        };
        input.click();
        return;
      }

      // Mobile
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'text/plain', 
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ]
      });

      if (result.type !== 'success') return;
      setFileName(result.name);
      setStatus("Reading file...");

      if (result.name.endsWith(".txt")) {
        const text = await FileSystem.readAsStringAsync(result.uri);
        setInputText(text);
        setStatus("Text loaded from .txt file");
        setIsExtracting(false);
        return;
      }

      setStatus("Processing file...");
      const fileBytes = await FileSystem.readAsStringAsync(result.uri, { encoding: FileSystem.EncodingType.Base64 });
      const fileData = { name: result.name, data: fileBytes };
      const client = await Client.connect("ikteng/text-summarizer");
      setStatus("Uploading file...");
      const response = await client.predict("/predict_1", { file: fileData });

      setInputText(response.data as string);
      setStatus("Text extraction complete");
      setIsExtracting(false);

    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to extract text from file.");
      setStatus("Error picking file");
      setIsExtracting(false);
    }
  };

  const summarizeText = async (id: string, text: string) => {
    setSummaries(prev =>
      prev.map(s => (s.id === id ? { ...s, status: "pending", summary: "" } : s))
    );

    try {
      const client = await Client.connect("ikteng/text-summarizer");
      const result = await client.predict("/predict", { text });

      setSummaries(prev =>
        prev.map(s =>
          s.id === id
            ? { ...s, summary: result.data as string, status: "done" }
            : s
        )
      );
    } catch (err) {
      console.error(err);
      setSummaries(prev =>
        prev.map(s => (s.id === id ? { ...s, status: "error" } : s))
      );
    }
  };

  const handleSubmit = () => {
    if (!inputText.trim()) return;

    const id = Date.now().toString();
    const now = new Date();
    const title = fileName ? `${fileName} - ${now.toLocaleString()}` : now.toLocaleString();

    setSummaries(prev => [
      { id, title, original_text: inputText, summary: '', status: 'pending' },
      ...prev
    ]);

    const textToSummarize = inputText;
    setInputText('');
    setFileName('');

    summarizeText(id, textToSummarize);
  };

  const handleReload = (id: string) => {
    const record = summaries.find(s => s.id === id);
    if (!record) return;
    summarizeText(id, record.original_text);
  };

  const handleDelete = (id: string) => {
    setSummaries(prev => prev.filter(s => s.id !== id));
  };

  const handleClear = () => {
    setInputText('');
    setFileName('');
  };

  return (
    <View style={[styles.appContainer, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Input Section */}
        <View style={[styles.inputSection, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.tint, borderBottomColor: colors.border }]}>Paste Text to Summarize</Text>
          <TextInput
            style={[styles.inputTextarea, { borderColor: colors.border, backgroundColor: colors.card, color: colors.text }]}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Paste or type text here..."
            placeholderTextColor={colors.icon}
            multiline
            numberOfLines={10}
          />

          {/* File Upload */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20, flex: 1 }}>
              <TouchableOpacity 
                style={[styles.uploadButton, { backgroundColor: colors.card, borderColor: colors.border }]} 
                onPress={handleFile} 
                disabled={isExtracting}
              >
                <Text style={[styles.uploadButtonText, { color: colors.text }]}>
                  {isExtracting ? "Extracting..." : "Choose file"}
                </Text>
              </TouchableOpacity>
              <Text style={{ flexShrink: 1, fontSize: 14, color: colors.icon }}>
                {fileName || 'No file chosen'}
              </Text>
            </View>
            <TouchableOpacity style={[styles.uploadButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={handleClear}>
              <Text style={[styles.uploadButtonText, { color: colors.text }]}>Clear</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[styles.submitButton, { backgroundColor: colors.tint }]} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>Summarize</Text>
          </TouchableOpacity>
        </View>

        {/* Summaries Section */}
        <View style={[styles.summarySection, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.tint, borderBottomColor: colors.border }]}>Summaries</Text>
          {summaries.length === 0 ? (
            <Text style={[styles.noSummaryText, { color: colors.icon }]}>No summaries yet.</Text>
          ) : (
            summaries.map(s => (
              <SummaryRecord
                key={s.id}
                id={s.id}
                title={s.title}
                original={s.original_text}
                summary={s.summary}
                status={s.status}
                onDelete={handleDelete}
                onReload={handleReload}
                colors={colors}
                downloadTextFile={downloadTextFile}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

interface SummaryRecordExtendedProps extends SummaryRecordProps {
  downloadTextFile: (filename: string, content: string) => void;
}

function SummaryRecord({
  id,
  title,
  original,
  summary,
  status,
  onDelete,
  onReload,
  colors,
  downloadTextFile
}: SummaryRecordExtendedProps) {
  const [expanded, setExpanded] = useState<boolean>(false);

  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied to clipboard!');
  };

  return (
    <View style={[styles.summaryRecord, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.summaryTitleWrapper}>
        <TouchableOpacity onPress={() => setExpanded(!expanded)}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: colors.text, marginRight: 20 }}>
              {expanded ? '▼' : '▶'}
            </Text>
            <Text style={[styles.summaryTitle, { color: colors.text }]}>{title}</Text>
            {status === 'pending' && <Text style={{ color: colors.icon }}> (Summarizing...)</Text>}
            {status === 'error' && <Text style={{ color: 'red' }}> (Error)</Text>}
          </View>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={() => onReload(id)} disabled={status === 'pending'}>
            <MaterialIcons name="refresh" size={24} color={status === 'pending' ? colors.icon : colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(id)}>
            <MaterialIcons name="delete" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {expanded && (
        <>
          {/* Original Text Section */}
          <View style={[styles.textSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.headerWithCopy}>
              <Text style={[styles.sectionHeader, { color: colors.tint }]}>Original Text</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={[styles.copyButton, { backgroundColor: colors.tint }]} onPress={() => copyToClipboard(original)}>
                  <Text style={styles.copyButtonText}>Copy</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.copyButton, { backgroundColor: colors.tint }]} onPress={() => downloadTextFile(`${title}-original.txt`, original)}>
                  <Text style={styles.copyButtonText}>Download</Text>
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView style={styles.textContent}>
              <Text style={{ color: colors.text }}>{original}</Text>
            </ScrollView>
          </View>

          {/* Summary Section */}
          <View style={[styles.textSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.headerWithCopy}>
              <Text style={[styles.sectionHeader, { color: colors.tint }]}>Summary</Text>
              {status === 'done' && (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity style={[styles.copyButton, { backgroundColor: colors.tint }]} onPress={() => copyToClipboard(summary)}>
                    <Text style={styles.copyButtonText}>Copy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.copyButton, { backgroundColor: colors.tint }]} onPress={() => downloadTextFile(`${title}-summary.txt`, summary)}>
                    <Text style={styles.copyButtonText}>Download</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            {status === 'pending' && <Text style={{ color: colors.text }}>Processing...</Text>}
            {status === 'done' && <Text style={{ color: colors.text }}>{summary}</Text>}
            {status === 'error' && <Text style={{ color: 'red' }}>Failed to summarize.</Text>}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  appContainer: { flex: 1 },
  scrollContainer: { padding: 20 },
  inputSection: { width: '100%', borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 5, padding: 24, marginBottom: 20 },
  summarySection: { width: '100%', borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 5, padding: 24 },
  sectionTitle: { fontWeight: '700', fontSize: 20, marginBottom: 20, borderBottomWidth: 2, paddingBottom: 6 },
  noSummaryText: { fontStyle: 'italic', fontSize: 16 },
  inputTextarea: { minHeight: 150, padding: 20, fontSize: 16, lineHeight: 24, textAlignVertical: 'top', borderRadius: 12, borderWidth: 1.5 },
  uploadButton: { padding: 10, borderRadius: 12, borderWidth: 1, alignSelf: 'flex-start' },
  uploadButtonText: { fontSize: 16, fontWeight: '600' },
  submitButton: { marginTop: 18, padding: 16, borderRadius: 12, alignItems: 'center' },
  submitButtonText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  summaryRecord: { borderWidth: 1.5, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, padding: 20, marginBottom: 22 },
  summaryTitleWrapper: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  summaryTitle: { fontWeight: '700', fontSize: 16 },
  textSection: { borderWidth: 1.5, marginBottom: 28, padding: 18, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 1 },
  headerWithCopy: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionHeader: { fontWeight: '700', fontSize: 16 },
  copyButton: { borderRadius: 8, padding: 5, paddingHorizontal: 14 },
  copyButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  textContent: { maxHeight: 220 },
});
