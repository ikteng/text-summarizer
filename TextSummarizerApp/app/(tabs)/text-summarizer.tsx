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
  Linking,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Clipboard from 'expo-clipboard';

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
}

export default function App() {
  const [inputText, setInputText] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const BACKEND_URL = "http://localhost:5000";

const handleFile = async () => {
  try {
    if (Platform.OS === 'web') {
      // Web: open file picker using <input>
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.txt,.pdf,.docx';
      input.onchange = async () => {
        if (!input.files || input.files.length === 0) return;
        const file = input.files[0];
        setFileName(file.name);

        if (file.type === 'text/plain') {
          const text = await file.text();
          setInputText(text);
        } else {
          const formData = new FormData();
          formData.append('file', file);
          const res = await fetch(`${BACKEND_URL}/api/extract-text`, {
            method: 'POST',
            body: formData,
          });
          if (!res.ok) throw new Error('Failed to extract text');
          const data = await res.json();
          setInputText(data.text);
        }
      };
      input.click();
      return;
    }

    // Mobile (iOS / Android)
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        'text/plain',
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
    });
    if (result.type !== 'success') return;

    setFileName(result.name);

    if (result.mimeType?.includes('text/plain')) {
      const content = await FileSystem.readAsStringAsync(result.uri);
      setInputText(content);
    } else {
      const formData = new FormData();
      formData.append('file', {
        uri: Platform.OS === 'ios' ? result.uri.replace('file://', '') : result.uri,
        name: result.name,
        type: result.mimeType || 'application/octet-stream',
      } as any);

      const res = await fetch(`${BACKEND_URL}/api/extract-text`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Failed to extract text');
      const data = await res.json();
      setInputText(data.text);
    }
  } catch (err) {
    console.error(err);
    Alert.alert('Error', 'Failed to extract text from file.');
  }
};


  const summarizeText = async (id: string, text: string) => {
    setSummaries(prev =>
      prev.map(s => s.id === id ? { ...s, status: 'pending', summary: '' } : s)
    );

    try {
      const res = await fetch(`${BACKEND_URL}/api/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) throw new Error('Summarization failed');

      const data = await res.json();
      setSummaries(prev =>
        prev.map(s => s.id === id ? { ...s, summary: data.summary, status: 'done' } : s)
      );
    } catch (err) {
      console.error(err);
      setSummaries(prev =>
        prev.map(s => s.id === id ? { ...s, status: 'error' } : s)
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

  return (
    <View style={styles.appContainer}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.inputSection}>
          <Text style={styles.sectionTitle}>Paste Text to Summarize</Text>
          <TextInput
            style={styles.inputTextarea}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Paste or type text here..."
            multiline
            numberOfLines={10}
          />

          {/* File Upload */}
            <TouchableOpacity style={styles.uploadButton} onPress={handleFile}>
                <Text style={styles.uploadButtonText}>Choose file</Text>
            </TouchableOpacity>

          <Text style={styles.fileName}>{fileName || 'No file chosen'}</Text>

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>Summarize</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Summaries</Text>
          {summaries.length === 0 ? (
            <Text style={styles.noSummaryText}>No summaries yet.</Text>
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
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function SummaryRecord({
  id,
  title,
  original,
  summary,
  status,
  onDelete,
  onReload
}: SummaryRecordProps) {
    const [expanded, setExpanded] = useState<boolean>(false);

    const copyToClipboard = async (text: string) => {
        await Clipboard.setStringAsync(text);
        Alert.alert('Copied to clipboard!');
    };

return (
    <View style={styles.summaryRecord}>
        <View style={styles.summaryTitleWrapper}>
            <TouchableOpacity onPress={() => setExpanded(!expanded)}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.summaryTitle}>
                {expanded ? '▼' : '▶'} {title}
                </Text>
                {status === 'pending' && <Text style={{ color: 'gray' }}> (Summarizing...)</Text>}
                {status === 'error' && <Text style={{ color: 'red' }}> (Error)</Text>}
            </View>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
                onPress={() => onReload(id)}
                disabled={status === 'pending'}
            >
                <MaterialIcons name="refresh" size={24} color={status === 'pending' ? '#aaa' : '#222'} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onDelete(id)}>
                <MaterialIcons name="delete" size={24} color="#222" />
            </TouchableOpacity>
            </View>
        </View>

        {expanded && (
            <>
            <View style={styles.textSection}>
                <View style={styles.headerWithCopy}>
                <Text style={styles.sectionHeader}>Original Text</Text>
                <TouchableOpacity
                    style={styles.copyButton}
                    onPress={() => copyToClipboard(original)}
                >
                    <Text style={styles.copyButtonText}>Copy</Text>
                </TouchableOpacity>
                </View>
                <ScrollView style={styles.textContent}>
                <Text>{original}</Text>
                </ScrollView>
            </View>

            <View style={styles.textSection}>
                <View style={styles.headerWithCopy}>
                <Text style={styles.sectionHeader}>Summary</Text>
                {status === 'done' && (
                    <TouchableOpacity
                    style={styles.copyButton}
                    onPress={() => copyToClipboard(summary)}
                    >
                    <Text style={styles.copyButtonText}>Copy</Text>
                    </TouchableOpacity>
                )}
                </View>
                {status === 'pending' && <Text>Processing...</Text>}
                {status === 'done' && <Text>{summary}</Text>}
                {status === 'error' && <Text style={{ color: 'red' }}>Failed to summarize.</Text>}
            </View>
            </>
        )}
        </View>
    );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: '#f0f4ff',
  },
  scrollContainer: {
    padding: 20,
  },
  inputSection: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 5,
    padding: 24,
    marginBottom: 20,
  },
  summarySection: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 5,
    padding: 24,
  },
  sectionTitle: {
    color: '#004a99',
    fontWeight: '700',
    fontSize: 20,
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#e0e7ff',
    paddingBottom: 6,
  },
  noSummaryText: {
    fontStyle: 'italic',
    color: '#888',
    fontSize: 16,
  },
  inputTextarea: {
    minHeight: 150,
    padding: 20,
    fontSize: 16,
    lineHeight: 24,
    textAlignVertical: 'top',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#d1d9e6',
    backgroundColor: '#fff',
    color: '#333',
    marginBottom: 16,
  },
  uploadButton: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#f0f4ff',
    borderWidth: 1,
    borderColor: '#cdd4db',
    alignSelf: 'flex-start',
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  fileName: {
    fontSize: 14,
    color: '#555',
    marginVertical: 8,
  },
  submitButton: {
    marginTop: 18,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#0066ff',
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  summaryRecord: {
    borderWidth: 1.5,
    borderColor: '#c1c9d9',
    borderRadius: 16,
    backgroundColor: '#f5f8ff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    padding: 20,
    marginBottom: 22,
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
    color: '#222',
  },
  textSection: {
    borderWidth: 1.5,
    borderColor: '#a5b5d1',
    marginBottom: 28,
    padding: 18,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 1,
  },
  headerWithCopy: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionHeader: {
    fontWeight: '700',
    color: '#003366',
    fontSize: 16,
  },
  copyButton: {
    backgroundColor: '#0066ff',
    borderRadius: 8,
    padding: 5,
    paddingHorizontal: 14,
  },
  copyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  textContent: {
    maxHeight: 220,
  },
});