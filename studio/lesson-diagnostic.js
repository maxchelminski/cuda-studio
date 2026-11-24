const LessonDiagnostic = (function () {
  "use strict";
  function inspect(value) {
    const text = String(value || "").normalize("NFKC")
      .replace(/\x1b\[[0-9;]*m/g, "")
      .replace(/[‘’‛`´]/g, "'")
      .replace(/[“”]/g, '"');
    if (!text.trim()) return {kind: "empty", text: "Paste the error line from your PowerShell build into the notes above, then check it here."};
    // Match the basename so quoted paths, drive letters, and folders with spaces all work.
    const location = /(?:^|[^A-Za-z0-9_.-])([\w.-]+\.(?:cpp|cxx|cc|cu|hpp|h))(?::([1-9]\d*)(?::([1-9]\d*))?|\(\s*([1-9]\d*)(?:,\s*([1-9]\d*))?\s*\))\s*:\s*(?:fatal\s+)?(error|warning)\b(?:\s+([A-Z]+\d+))?\s*:\s*(.+)/i;
    const semicolon = /\b(?:expected|missing)\s+(?:['"]?;['"]?|(?:a\s+)?semicolon)\s+(?:before\s+(?:['"]?}['"]?|(?:the\s+)?closing\s+brace)|(?:after|at\s+(?:the\s+)?end\s+of)\s+(?:(?:a|the)\s+)?return\b)/i;
    let firstError, firstWarning, functionName = "";
    for (const line of text.split(/\r\n?|\n/)) {
      const context = line.match(/\b01_frames\.cpp:\s+In (?:member )?function\s+['"]?[^('"\n]*?\b([A-Za-z_]\w*)\s*\(/i);
      if (context) { functionName = context[1]; continue; }
      if (!line.trim()) functionName = "";
      const hit = line.match(location);
      if (!hit) continue;
      const [, file, gccLine, gccColumn, msvcLine, msvcColumn, severity, code, detail] = hit;
      const column = gccColumn || msvcColumn;
      const at = `${file}, line ${gccLine || msvcLine}${column ? `, column ${column}` : ""}`;
      const message = `${at}. ${code ? code + ": " : ""}${detail.trim()}`;
      if (severity.toLowerCase() === "warning") {
        firstWarning ||= message;
        continue;
      }
      const lessonFile = file.toLowerCase() === "01_frames.cpp";
      if (lessonFile && (!functionName || functionName === "fps") && semicolon.test(detail) && (!code || code.toUpperCase() === "C2143")) {
        return {kind: "match", text: `This matches the missing-semicolon exercise. ${message}\nThe compiler marked where it noticed the unfinished statement. Restore the semicolon at the end of the return line in fps, save, and rebuild.`};
      }
      // A full build log can contain another file's error before the exercise's error.
      if (!firstError || (lessonFile && !firstError.lessonFile)) firstError = {lessonFile, message, functionName};
    }
    if (firstError?.lessonFile) {
      const context = firstError.functionName ? `The error is inside ${firstError.functionName}. ` : "";
      return {kind: "other-error", text: `You captured a compiler error with its location. ${firstError.message}\n${context}Look for the error about a semicolon before the closing brace or after the return statement inside fps.`};
    }
    if (firstError) return {kind: "other-file", text: `This diagnostic names another source file. ${firstError.message}\nFind the line naming 01_frames.cpp in the build output and copy that line too.`};
    if (semicolon.test(text)) return {kind: "missing-location", text: "You have the missing-semicolon message. Include the beginning of the same output line, with 01_frames.cpp and its line number, so someone reading your notes can find it."};
    if (firstWarning || /\bwarning(?:\s+[A-Z]+\d+)?\s*:/i.test(text)) return {kind: "warning", text: "A warning gives the compiler’s advice. Look for the line containing “error” from the build when you removed the semicolon. Copy its filename, line number and message."};
    if (/\b(?:TRY|PASS)\b[^\r\n]*\b(?:expected|got)\b/i.test(text)) return {kind: "test", text: "You captured a running program’s test output. Keep it as evidence of your FPS results. For the compiler exercise, also paste the error line from the build with the semicolon removed."};
    if (/\b(?:exit(?:ed)?(?:\s+with)?(?:\s+(?:exit|status))?\s+code|non[- ]zero|CategoryInfo|FullyQualifiedErrorId|build (?:stopped|failed)|compil(?:ation|er) failed|nativecommanderror)\b/i.test(text)) return {kind: "wrapper", text: "That line reports that the build stopped. Look earlier in PowerShell for the compiler’s line naming 01_frames.cpp and explaining the missing semicolon."};
    return {kind: "unrecognized", text: "Look in the build output for 01_frames.cpp, a line number, and an error mentioning the missing semicolon. Paste the complete line here alongside any explanation you wrote."};
  }
  function view() {
    return `<div class="diagnostic-check"><button type="button" class="sub" id="check-diagnostic">Check my compiler message</button><p class="small dim">Optional · Checks the compiler error in your notes above.</p><p id="diagnostic-feedback" role="status" aria-live="polite" style="white-space: pre-line"></p></div>`;
  }
  function bind(root) {
    const button = root.querySelector("#check-diagnostic");
    const note = root.querySelector("#note");
    const feedback = root.querySelector("#diagnostic-feedback");
    if (!button || !note || !feedback) return;
    button.onclick = () => { feedback.textContent = inspect(note.value).text; };
    note.addEventListener?.("input", () => { feedback.textContent = ""; });
  }
  return {view, bind, inspect};
})();
