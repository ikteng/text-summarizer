import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

import './web_utils_stub.dart'
    if (dart.library.html) './web_utils_web.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Text Summarizer',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color.fromARGB(255, 104, 126, 255),
        ),
      ),
      home: const MyHomePage(title: 'AI Text Summarizer'),
    );
  }
}

class MyHomePage extends StatefulWidget {
  const MyHomePage({super.key, required this.title});
  final String title;

  @override
  State<MyHomePage> createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  final TextEditingController _inputController = TextEditingController();
  String _summary = "";
  bool _isLoading = false;
  String? _selectedFileName;

  Future<void> _summarizeText() async {
    final text = _inputController.text.trim();
    if (text.isEmpty) return;

    setState(() {
      _isLoading = true;
      _summary = "";
    });

    try {
      final uri = Uri.parse("https://ikteng-text-summarizer-docker.hf.space/summarize");
      final response = await http.post(
        uri,
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({"text": text}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          _summary = data["summary"] ?? "No summary returned.";
        });
      } else {
        setState(() {
          _summary = "Error: ${response.statusCode} — ${response.reasonPhrase}";
        });
      }
    } catch (e) {
      setState(() {
        _summary = "Failed to connect to backend: $e";
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _downloadSummary() async {
    if (_summary.isEmpty) return;

    try {
      await downloadFile(_summary, "summary.txt");

      // Show SnackBar after saving
      if (!kIsWeb) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("Summary downloaded to your device!"),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("Summary downloaded!"),
          ),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text("Failed to download summary: $e"),
        ),
      );
    }
  }

  Future<void> _pickFile() async {
    final (content, filename) = await pickFile();
    if (content != null) {
      setState(() {
        _inputController.text = content;
        _selectedFileName = filename;
      });
    }
  }

  Future<void> _pasteFromClipboard() async {
    final text = await pasteFromClipboard();
    if (text != null && text.isNotEmpty) {
      setState(() {
        _inputController.text = text;
        _selectedFileName = null; // clear uploaded file
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Text pasted from clipboard!")),
      );
    }
  }

  Future<void> _copySummary() async {
    if (_summary.isNotEmpty) {
      await copyToClipboard(_summary);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Summary copied to clipboard!")),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final inputLength = _inputController.text.length;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        title: Text(widget.title),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  "Enter text to summarize:",
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                IconButton(
                  icon: const Icon(Icons.paste),
                  tooltip: "Paste text",
                  onPressed: _pasteFromClipboard,
                ),
              ],
            ),
            const SizedBox(height: 8),

            Expanded(
              child: TextField(
                controller: _inputController,
                maxLines: null,
                expands: true,
                textAlignVertical: TextAlignVertical.top,
                decoration: const InputDecoration(
                  border: OutlineInputBorder(),
                  hintText: "Paste or type your text here...",
                ),
                onChanged: (_) {
                  setState(() {
                    // Clear uploaded file if user types or deletes all text
                    _selectedFileName = null;
                  });
                },
              ),
            ),

            if (inputLength > 0)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(
                  "Length: $inputLength characters",
                  style: const TextStyle(fontSize: 14, color: Colors.grey),
                ),
              ),

            const SizedBox(height: 8),

            Row(
              children: [
                ElevatedButton.icon(
                  icon: const Icon(Icons.upload_file),
                  label: const Text("Upload .txt file"),
                  onPressed: _pickFile,
                ),
                const SizedBox(width: 8),
                if (_selectedFileName != null)
                  Expanded(
                    child: Text(
                      _selectedFileName!,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
              ],
            ),

            const SizedBox(height: 16),

            ElevatedButton(
              onPressed: _isLoading ? null : _summarizeText,
              child: _isLoading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        color: Colors.white,
                        strokeWidth: 2,
                      ),
                    )
                  : const Text("Summarize"),
            ),

            const SizedBox(height: 16),

            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  "Summary:",
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
                if (_summary.isNotEmpty)
                  Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.copy),
                        tooltip: "Copy summary",
                        onPressed: _copySummary,
                      ),
                      IconButton(
                        icon: const Icon(Icons.download),
                        tooltip: "Download summary",
                        onPressed: _downloadSummary,
                      ),
                    ],
                  ),
              ],
            ),

            const SizedBox(height: 8),

            Expanded(
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: SingleChildScrollView(
                  child: SelectableText(
                    _summary.isEmpty
                        ? "Your summary will appear here."
                        : _summary,
                    style: const TextStyle(fontSize: 16),
                  ),
                ),
              ),
            ),

            if (_summary.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(
                  "Length: ${_summary.length} characters",
                  style: const TextStyle(fontSize: 14, color: Colors.grey),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
