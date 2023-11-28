import * as fs from "fs";
import * as vscode from "vscode";

interface EnvItem {
  key: string;
  value: string;
  line: number;
  position: number;
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider(["javascript", "typescript"], {
      provideDefinition(document, position, token) {
        const fileName = document.fileName;
        const match = fileName.match(/(\S*)\/src/);
        if (match == null) {
          return;
        }
        const projectDir = match[1];
        const word = document.getText(document.getWordRangeAtPosition(position));
        const line = document.lineAt(position).text;
        if (line.indexOf("process.env") == -1) {
          return null;
        }
        const envPath = projectDir + "/.env";
        const envItems = parseEnvFile(envPath);
        console.log(envItems);
        return envItems
          .filter((envItem) => envItem.key == word)
          .map((envItem) => {
            return new vscode.Location(vscode.Uri.file(envPath), new vscode.Position(envItem.line, envItem.position));
          });
      },
    })
  );
}

function parseEnvFile(envPath: string): EnvItem[] {
  const envFile = fs.readFileSync(envPath, "utf8");
  const lines = envFile.split("\n");
  const envItems: EnvItem[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/(.*?)=(.*)/);
    if (match == null) {
      continue;
    }
    envItems.push({
      key: match[1],
      value: match[2],
      line: i,
      position: line.indexOf(match[2]),
    });
  }
  return envItems;
}

// This method is called when your extension is deactivated
export function deactivate() {}
