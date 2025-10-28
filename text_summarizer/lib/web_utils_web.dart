// web_utils_web.dart
// ignore_for_file: avoid_web_libraries_in_flutter

import 'dart:convert';
import 'dart:async';
import 'dart:html' as html;

/// Pick a .txt file from local system and return its content + filename.
Future<(String?, String?)> pickFile() async {
  final input = html.FileUploadInputElement()..accept = '.txt';
  input.click();

  final completer = Completer<(String?, String?)>();

  input.onChange.listen((event) {
    final file = input.files?.first;
    if (file == null) {
      completer.complete((null, null));
      return;
    }

    final reader = html.FileReader();
    reader.readAsText(file);
    reader.onLoadEnd.listen((event) {
      completer.complete((reader.result as String, file.name));
    });
  });

  return completer.future;
}

Future<void> downloadFile(String text, String filename) async {
  final bytes = utf8.encode(text);
  final blob = html.Blob([bytes]);
  final url = html.Url.createObjectUrlFromBlob(blob);
  final anchor = html.AnchorElement(href: url)
    ..setAttribute("download", filename)
    ..click();
  html.Url.revokeObjectUrl(url);
}

Future<String?> pasteFromClipboard() async {
  try {
    final text = await html.window.navigator.clipboard!.readText();
    return text;
  } catch (_) {
    return null;
  }
}

Future<void> copyToClipboard(String text) async {
  await html.window.navigator.clipboard!.writeText(text);
}
