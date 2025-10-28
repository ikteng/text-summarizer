// web_utils_stub.dart
import 'dart:io';
import 'package:flutter/services.dart';
import 'package:file_picker/file_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:flutter/foundation.dart';

/// Pick a text file from local storage and return its content + filename
Future<(String?, String?)> pickFile() async {
  try {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['txt'],
    );

    if (result == null || result.files.isEmpty) {
      return (null, null);
    }

    final file = result.files.first;
    String content = "";

    if (file.path != null) {
      content = await File(file.path!).readAsString();
    } else if (file.bytes != null) {
      content = String.fromCharCodes(file.bytes!);
    }

    return (content, file.name);
  } catch (e) {
    return (null, null);
  }
}

/// Save text as a .txt file to Downloads folder (mobile/desktop)
Future<void> downloadFile(String text, String filename) async {
  try {
    Directory? directory;

    if (Platform.isAndroid || Platform.isIOS) {
      // Mobile: use Downloads directory
      directory = await getExternalStorageDirectory();
      if (directory != null) {
        // On Android, getExternalStorageDirectory() points to /storage/emulated/0/Android/data/<package>/files
        // So we can try parent 'Download' folder
        final downloadsDir = Directory('/storage/emulated/0/Download');
        if (downloadsDir.existsSync()) {
          directory = downloadsDir;
        }
      }
    } else {
      // Desktop: use Downloads directory
      directory = await getDownloadsDirectory();
    }

    if (directory == null) {
      // Fallback: app directory
      directory = await getApplicationDocumentsDirectory();
    }

    final file = File('${directory.path}/$filename');
    await file.writeAsString(text);

    if (!kIsWeb) {
      print('File saved to: ${file.path}');
    }
  } catch (e) {
    print('Failed to save file: $e');
    // Fallback: copy to clipboard
    Clipboard.setData(ClipboardData(text: text));
  }
}

/// Paste text from clipboard
Future<String?> pasteFromClipboard() async {
  try {
    final data = await Clipboard.getData('text/plain');
    return data?.text;
  } catch (_) {
    return null;
  }
}

/// Copy text to clipboard
Future<void> copyToClipboard(String text) async {
  await Clipboard.setData(ClipboardData(text: text));
}
