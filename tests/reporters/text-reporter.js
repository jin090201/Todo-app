// 테스트 결과를 사람이 읽기 쉬운 텍스트 파일로 저장하는 Jest 리포터
const fs = require("fs");
const path = require("path");

const OUTPUT_FILE = path.join("tests", "results", "test-output.txt");

// 터미널 색깔 코드(\u001b[31m 같은 것)를 지운다
const stripColor = (text) => text.replace(/\u001b\[[0-9;]*m/g, "");

class TextReporter {
  onRunComplete(_contexts, results) {
    const lines = [`실행 시각: ${new Date().toLocaleString("ko-KR")}`, ""];

    for (const file of results.testResults) {
      const filePath = path.relative(process.cwd(), file.testFilePath);
      const failed = file.numFailingTests > 0 || file.testExecError;
      lines.push(`${failed ? "FAIL" : "PASS"} ${filePath}`);

      // 테스트 하나하나의 결과 (✓ 통과, ✕ 실패)
      for (const test of file.testResults) {
        lines.push(`  ${test.status === "passed" ? "✓" : "✕"} ${test.title}`);
      }

      // 실패 이유 (파일을 아예 못 읽은 경우도 여기에 나온다)
      if (file.failureMessage) {
        lines.push("", stripColor(file.failureMessage));
      }
      lines.push("");
    }

    // results.success는 리포터가 불린 뒤에 정해지므로 직접 계산한다
    const success =
      results.numFailedTestSuites === 0 &&
      results.numRuntimeErrorTestSuites === 0 &&
      !results.wasInterrupted;

    lines.push(
      `Test Suites: ${results.numFailedTestSuites} failed, ${results.numPassedTestSuites} passed, ${results.numTotalTestSuites} total`,
      `Tests:       ${results.numFailedTests} failed, ${results.numPassedTests} passed, ${results.numTotalTests} total`,
      `전체 결과:   ${success ? "통과" : "실패"}`,
    );

    fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
    fs.writeFileSync(OUTPUT_FILE, lines.join("\n") + "\n", "utf8");
  }
}

module.exports = TextReporter;
