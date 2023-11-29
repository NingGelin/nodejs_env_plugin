import * as fs from "fs";
import path from "path";
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

  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider(["env"], {
      async provideDefinition(document, position, token) {
        const fileName = document.fileName;
        const tempArray = fileName.split("/");
        tempArray.pop();
        const parentDir = tempArray.join("/");
        console.log(parentDir);

        const configurationItem = "process.env." + document.getText(document.getWordRangeAtPosition(position));
        console.log(configurationItem);

        const vsCodeLocations: vscode.Location[] = [];
        getAllTsFilesInDirectory(parentDir + "/src").forEach((file) => {
          const fileContent = fs.readFileSync(file, "utf-8");
          if (fileContent.indexOf("process.env") == -1) {
            return;
          } else {
            const lines = fileContent.split("\n");
            lines.forEach((line, index) => {
              if (line.includes(configurationItem)) {
                const column = line.indexOf("process.env");
                vsCodeLocations.push(
                  new vscode.Location(vscode.Uri.file(file), new vscode.Position(index, column + 12))
                );
              }
            });
          }
        });
        return vsCodeLocations;
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

function getAllTsFilesInDirectory(directoryPath: string): string[] {
  const files: string[] = [];

  fs.readdirSync(directoryPath).forEach((file: string) => {
    const filePath = path.join(directoryPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isFile() && path.extname(filePath) === ".ts") {
      files.push(filePath);
    } else if (stat.isDirectory()) {
      files.push(...getAllTsFilesInDirectory(filePath));
    }
  });

  return files;
}

// This method is called when your extension is deactivated
export function deactivate() {}
