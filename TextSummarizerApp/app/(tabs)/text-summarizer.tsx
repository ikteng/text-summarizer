import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  Dimensions,
  useWindowDimensions,
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

const { width, height } = Dimensions.get('window');
const isSmallDevice = width < 360;

export default function App() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];

  const [inputText, setInputText] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [status, setStatus] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const BACKEND_URL = "https://ikteng-text-summarizer-docker.hf.space"

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

      if (Platform.OS === "web") {
        // Web: open file picker
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".txt,.pdf,.docx";

        input.onchange = async () => {
          if (!input.files || input.files.length === 0) return;
          const file = input.files[0];
          setFileName(file.name);
          setStatus(`File selected: ${file.name}`);

          if (file.type === "text/plain") {
            const text = await file.text();
            setInputText(text);
            setStatus("Text loaded from .txt file");
            setIsExtracting(false);
            return;
          }

          setStatus("Uploading file for extraction...");
          const formData = new FormData();
          formData.append("file", file);

          const res = await fetch(`${BACKEND_URL}/api/extract-text`, {
            method: "POST",
            body: formData,
          });
          if (!res.ok) throw new Error("Failed to extract text");

          const data = await res.json();
          setInputText(data.text);
          setStatus("Text extraction complete");
          setIsExtracting(false);
        };
        input.click();
        return;
      }

      // --- Mobile ---
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "text/plain",
          "application/pdf",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
      });

      if (result.type !== "success") return;
      setFileName(result.name);

      // --- Upload to backend ---
      setStatus("Uploading file for extraction...");
      const formData = new FormData();
      formData.append("file", {
        uri: Platform.OS === "ios" ? result.uri.replace("file://", "") : result.uri,
        name: result.name,
        type: result.mimeType || "application/octet-stream",
      } as any);

      const res = await fetch(`${BACKEND_URL}/api/extract-text`, { method: "POST", body: formData });
      if (!res.ok) throw new Error("Failed to extract text");

      const data = await res.json();
      setInputText(data.text);
      setStatus("Text extraction complete");
      setIsExtracting(false);

    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to extract text from file.");
      setStatus("Error extracting text");
      setIsExtracting(false);
    }
  };

  const summarizeText = async (id: string, text: string) => {
    // mark the specific summary card as pending
    setSummaries((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, status: "pending", summary: "" } : s
      )
    );

    try {
      setStatus("Summarizing text...");

      const res = await fetch(`${BACKEND_URL}/api/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) throw new Error("Summarization failed");

      const data = await res.json();

      // normalize summary (in case backend returns list/dict)
      let summary: string;
      if (Array.isArray(data.summary)) {
        summary = data.summary.join(" ");
      } else if (typeof data.summary === "object") {
        summary = JSON.stringify(data.summary);
      } else {
        summary = data.summary ?? "";
      }

      // update that specific summary card
      setSummaries((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, summary, status: "done" } : s
        )
      );

      setStatus(""); // clear global status after success
    } catch (err) {
      console.error(err);

      setSummaries((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, status: "error" } : s
        )
      );
      setStatus("Error during summarization");
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
    setIsExtracting(false);
  };

return (
    <View style={[styles.appContainer, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Input Section */}
        <View style={[styles.inputSection, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.tint, borderBottomColor: colors.border }]}>
            Paste Text to Summarize
          </Text>

          <TextInput
            style={[
              styles.inputTextarea,
              {
                borderColor: colors.border,
                backgroundColor: colors.card,
                color: colors.text,
                fontSize: isSmallDevice ? 14 : 16,
                minHeight: height * 0.15,
              },
            ]}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Paste or type text here..."
            placeholderTextColor={colors.icon}
            multiline
          />

          {/* File Upload */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginVertical: 8,
              flexWrap: 'wrap',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
              <TouchableOpacity
                style={[styles.uploadButton, { backgroundColor: colors.card, borderColor: colors.border, marginRight: 10 }]}
                onPress={handleFile}
                disabled={isExtracting}
              >
                <Text style={[styles.uploadButtonText, { color: colors.text }]}>
                  {isExtracting ? "Extracting..." : "Choose file"}
                </Text>
              </TouchableOpacity>
              <Text style={{ flexShrink: 1, fontSize: isSmallDevice ? 12 : 14, color: colors.icon }}>
                {fileName || 'No file chosen'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.uploadButton, { backgroundColor: colors.card, borderColor: colors.border, marginTop: isSmallDevice ? 6 : 0 }]}
              onPress={handleClear}
            >
              <Text style={[styles.uploadButtonText, { color: colors.text }]}>Clear</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.tint, marginTop: isSmallDevice ? 10 : 18 }]}
            onPress={handleSubmit}
          >
            <Text style={[styles.submitButtonText, { fontSize: isSmallDevice ? 16 : 18 }]}>Summarize</Text>
          </TouchableOpacity>
        </View>

        {/* Summaries Section */}
        <View style={[styles.summarySection, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.tint, borderBottomColor: colors.border }]}>
            Summaries
          </Text>

          {summaries.length === 0 ? (
            <Text style={[styles.noSummaryText, { color: colors.icon, fontSize: isSmallDevice ? 14 : 16 }]}>
              No summaries yet.
            </Text>
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
      {/* Header */}
      <View style={styles.summaryTitleWrapper}>
        <TouchableOpacity onPress={() => setExpanded(!expanded)} style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
            <Text style={{ color: colors.text, marginRight: 10 }}>{expanded ? '▼' : '▶'}</Text>
            <Text style={[styles.summaryTitle, { color: colors.text }]}>{title}</Text>
            {status === 'pending' && <Text style={{ color: colors.icon }}> (Summarizing...)</Text>}
            {status === 'error' && <Text style={{ color: 'red' }}> (Error)</Text>}
          </View>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity onPress={() => onReload(id)} disabled={status === 'pending'}>
            <MaterialIcons
              name="refresh"
              size={isSmallDevice ? 20 : 24}
              color={status === 'pending' ? colors.icon : colors.text}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(id)} style={{ marginLeft: 10 }}>
            <MaterialIcons name="delete" size={isSmallDevice ? 20 : 24} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {expanded && (
        <ScrollView style={{ maxHeight: height * 0.5 }}>
          {/* Original Text Section */}
          <View style={[styles.textSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.headerWithCopy}>
              <Text style={[styles.sectionHeader, { color: colors.tint }]}>Original Text</Text>
              <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity
                  style={[styles.copyButton, { backgroundColor: colors.tint, marginRight: 8 }]}
                  onPress={() => copyToClipboard(original)}
                >
                  <Text style={styles.copyButtonText}>Copy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.copyButton, { backgroundColor: colors.tint }]}
                  onPress={() => downloadTextFile(`${title}-original.txt`, original)}
                >
                  <Text style={styles.copyButtonText}>Download</Text>
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView style={{ maxHeight: 180 }}>
              <Text style={{ color: colors.text, fontSize: isSmallDevice ? 14 : 16 }}>{original}</Text>
            </ScrollView>
          </View>

          {/* Summary Section */}
          <View style={[styles.textSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.headerWithCopy}>
              <Text style={[styles.sectionHeader, { color: colors.tint }]}>Summary</Text>
              {status === 'done' && (
                <View style={{ flexDirection: 'row' }}>
                  <TouchableOpacity
                    style={[styles.copyButton, { backgroundColor: colors.tint, marginRight: 8 }]}
                    onPress={() => copyToClipboard(summary)}
                  >
                    <Text style={styles.copyButtonText}>Copy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.copyButton, { backgroundColor: colors.tint }]}
                    onPress={() => downloadTextFile(`${title}-summary.txt`, summary)}
                  >
                    <Text style={styles.copyButtonText}>Download</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            {status === 'pending' && <Text style={{ color: colors.text }}>Processing...</Text>}
            {status === 'done' && <Text style={{ color: colors.text, fontSize: isSmallDevice ? 14 : 16 }}>{summary}</Text>}
            {status === 'error' && <Text style={{ color: 'red' }}>Failed to summarize.</Text>}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  appContainer: { flex: 1 },
  scrollContainer: { padding: 16, paddingBottom: 40 },
  inputSection: { width: '100%', borderRadius: 16, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 5 },
  summarySection: { width: '100%', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 5 },
  sectionTitle: { fontWeight: '700', fontSize: 18, marginBottom: 12, borderBottomWidth: 2, paddingBottom: 4 },
  noSummaryText: { fontStyle: 'italic' },
  inputTextarea: { padding: 12, borderRadius: 12, borderWidth: 1.5, textAlignVertical: 'top' },
  uploadButton: { padding: 10, borderRadius: 12, borderWidth: 1 },
  uploadButtonText: { fontWeight: '600' },
  submitButton: { padding: 14, borderRadius: 12, alignItems: 'center' },
  submitButtonText: { fontWeight: '700', color: '#fff' },
  summaryRecord: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  summaryTitleWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryTitle: {
    fontWeight: '700',
    fontSize: 16,
    flexShrink: 1,
  },
  textSection: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  headerWithCopy: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  sectionHeader: {
    fontWeight: '700',
    fontSize: 16,
  },
  copyButton: {
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  copyButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  textContent: { maxHeight: 220 },
});
