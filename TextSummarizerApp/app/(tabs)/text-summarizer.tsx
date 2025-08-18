import React, { useState } from 'react';
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

  const BACKEND_URL = "https://ikteng-text-summarizer-docker.hf.space";

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

            // Mobile
      try {
        console.log("Opening document picker...");

        const result = await DocumentPicker.getDocumentAsync({
          type: [
            "text/plain",
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          ],
        });

        console.log("File picker result:", result);

        if (result.canceled) return;

        const file = result.assets[0]; // access first selected file
        setFileName(file.name);

        setStatus("Uploading file for extraction...");
        console.log("Uploading file to backend...");

        const formData = new FormData();
        formData.append("file", {
          uri: file.uri,
          name: file.name,
          type: file.mimeType || "application/octet-stream",
        });

        const res = await fetch(`${BACKEND_URL}/api/extract-text`, {
          method: "POST",
          body: formData,
          // Do NOT set Content-Type manually! fetch will handle it
        });

        console.log("Server response status:", res.status);

        if (!res.ok) throw new Error("Failed to extract text");

        const data = await res.json();
        // console.log("Data received from backend:", data);
        console.log("Extracted Text!")

        setInputText(data.text);
        setStatus("Text extraction complete");
        setIsExtracting(false);
      } catch (err) {
        console.error("Error during file upload:", err);
        setStatus("Error uploading file");
        setIsExtracting(false);
      }

    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to extract text from file.");
      setStatus("Error extracting text");
      setIsExtracting(false);
    }
  };

  const summarizeText = async (id: string, text: string) => {
    setSummaries(prev =>
      prev.map(s => (s.id === id ? { ...s, status: "pending", summary: "" } : s))
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
    } catch (err) {
      console.error(err);
       setSummaries((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, status: "error" } : s
        )
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
    setIsExtracting(false);
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
  scrollContainer: { padding: 16 },

  // Sections
  inputSection: { 
    width: '100%', 
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 16 
  },
  summarySection: { 
    width: '100%', 
    padding: 16, 
    borderRadius: 12 
  },

  // Text
  sectionTitle: { 
    fontWeight: '600', 
    fontSize: 18, 
    marginBottom: 12 
  },
  noSummaryText: { 
    fontStyle: 'italic', 
    fontSize: 14 
  },

  // Input
  inputTextarea: { 
    minHeight: 120, 
    padding: 12, 
    fontSize: 15, 
    lineHeight: 22, 
    textAlignVertical: 'top', 
    borderRadius: 8, 
    borderWidth: 1, 
    marginBottom: 12 
  },

  // Buttons
  uploadButton: { 
    paddingVertical: 8, 
    paddingHorizontal: 14, 
    borderRadius: 8, 
    borderWidth: 1 
  },
  uploadButtonText: { 
    fontSize: 15, 
    fontWeight: '500' 
  },
  submitButton: { 
    marginTop: 12, 
    padding: 14, 
    borderRadius: 8, 
    alignItems: 'center' 
  },
  submitButtonText: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#fff' 
  },

  // Summary cards
  summaryRecord: { 
    borderWidth: 1, 
    borderRadius: 10, 
    padding: 14, 
    marginBottom: 16 
  },
  summaryTitleWrapper: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 8 
  },
  summaryTitle: { 
    fontWeight: '600', 
    fontSize: 15 
  },

  // Text blocks
  textSection: { 
    borderWidth: 1, 
    marginBottom: 16, 
    padding: 12, 
    borderRadius: 8 
  },
  headerWithCopy: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 6 
  },
  sectionHeader: { 
    fontWeight: '600', 
    fontSize: 15 
  },
  copyButton: { 
    borderRadius: 6, 
    paddingVertical: 4, 
    paddingHorizontal: 10 
  },
  copyButtonText: { 
    color: '#fff', 
    fontSize: 13, 
    fontWeight: '500' 
  },
  textContent: { 
    maxHeight: 200 
  },
});
