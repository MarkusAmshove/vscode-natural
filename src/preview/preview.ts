import { basename } from "path";
import * as vscode from "vscode";

export function registerMapPreview(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand(
        "natural.openMapPreviewToSide",
        (map: vscode.Uri) => {
            if (!map) {
                return;
            }

            const mapName = basename(map.path);
            const panel = vscode.window.createWebviewPanel("natura.map", mapName, vscode.ViewColumn.Beside);
            const preview = new MapPreview(panel, map);
        }
    ));
}

class MapPreview {
    private inputThrottle: NodeJS.Timeout | undefined;
    private isFirstUpdate = true;
    private lineSize = 80;
    private pageSize = 24;

    constructor(private panel: vscode.WebviewPanel, private mapFile: vscode.Uri) {
        // const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(mapFile, '*'));
        // watcher.onDidChange(uri => {
        //     if (this.isPreviewOf(uri)) {

        //     }
        // });

        // TODO: Dispose
        vscode.workspace.onDidChangeTextDocument(event => {
            if (this.isPreviewOf(event.document.uri)) {
                this.refreshPreview();
            }
        });

        this.updatePreview();
    }

    private isPreviewOf(resource: vscode.Uri): boolean {
        return this.mapFile.fsPath === resource.fsPath;
    }

    private refreshPreview() {
        if (!this.inputThrottle) {
            if (this.isFirstUpdate) {
                this.updatePreview();
            } else {
                this.inputThrottle = setTimeout(() => this.updatePreview(), 300);
            }
        }
    }

    private async updatePreview(): Promise<void> {
        clearTimeout(this.inputThrottle);
        this.inputThrottle = undefined;
        this.isFirstUpdate = false;

        let content = await vscode.workspace.openTextDocument(this.mapFile);
        this.panel.webview.html = this.renderHtml(content.getText());
        // if (this.disposed) {
        //     return;
        // }
    }

    private renderHtml(content: string): string {
        return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Map Preview</title>
    <style>${this.createStylesheet()}</style>
  </head>
  <body>
    <div id="map">
      <span>${this.emptyLine(80)}</span><br/>
      <span>${this.emptyLine(80)}</span><br/>
      <span>*****</span><span>In Zeile 1</span><span class="selected cutoff" title="#VARIABLE">#VAR</span><span>    </span><br/>
      <span>    </span><span>In Zeile 2</span><span class="cutoff" title="#VARIABLE">#VAR</span><span>    </span><br/>
      <span>${this.emptyLine(80)}</span><br/>
      <span>${this.emptyLine(80)}</span><br/>
      <span>${this.emptyLine(80)}</span><br/>
      <span>${this.emptyLine(80)}</span><br/>
      <span>${this.emptyLine(80)}</span><br/>
      <span>${this.emptyLine(80)}</span><br/>
      <span>${this.emptyLine(80)}</span><br/>
      <span>${this.emptyLine(80)}</span><br/>
      <span>${this.emptyLine(80)}</span><br/>
      <span>${this.emptyLine(80)}</span><br/>
    </div>

    <pre>${content}</pre>
  </body>
</html>

`;
    }

    private createStylesheet(): string {
        const isDark = vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark;
        return `
body {
    color: brown;
}

#map {
	background: gray;
	font-family: monospace;
    border: solid 1px;
    border-color: ${isDark ? "white" : "black"};
    max-width: ${this.lineSize}em;
    max-height: ${this.pageSize}em;
}

.selected {
	border: solid 1px;
	border-color: red;
}

.cutoff {
  position: relative;
  display: inline-block;
  border-bottom: 1px dotted black;
}
`;
    }

    private emptyLine(lineSize: number): string {

        return "&emsp;".repeat(lineSize);
    }
}