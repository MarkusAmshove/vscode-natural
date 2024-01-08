import { basename } from "path";
import * as vscode from "vscode";
import { LanguageClient } from "vscode-languageclient/node";
import { InputStructure } from "./previewTypes";

export function registerMapPreview(context: vscode.ExtensionContext, client: LanguageClient) {
    context.subscriptions.push(vscode.commands.registerCommand(
        "natural.openMapPreviewToSide",
        (map: vscode.Uri) => {
            if (!map) {
                return;
            }

            const mapName = basename(map.path);
            const panel = vscode.window.createWebviewPanel("natura.map", mapName, vscode.ViewColumn.Beside, { enableScripts: true });

            const preview = new MapPreview(panel, map, client);
        }
    ));
}

class MapPreview {
    private inputThrottle: NodeJS.Timeout | undefined;
    private isFirstUpdate = true;
    private lineSize = 80;
    private pageSize = 24;
    private structure: InputStructure = null!;

    constructor(private panel: vscode.WebviewPanel, private mapFile: vscode.Uri, private client: LanguageClient) {
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

        // TODO: Dispose
        vscode.window.onDidChangeTextEditorSelection(event => {
            if (!this.isPreviewOf(event.textEditor.document.uri)) {
                return;
            }

            this.revealElement(event.selections[0].active.line, event.selections[0].active.character);
        });

        this.updatePreview();
    }

    private revealElement(line: number, character: number) {

        let idToReveal: number = -1;
        for(const element of this.structure.elements) {
            if (element.kind !== "operand") {
                continue;
            }

            if (element.sourceLine === line && element.sourceColumnStart <= character && element.sourceColumnEnd >= character) {
                idToReveal = element.id;
                console.log("Revealing:", idToReveal);
            }
        }

        this.panel.webview.postMessage({
            kind: "reveal",
            id: idToReveal,
        });
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

        this.structure = await this.client.sendRequest<InputStructure>("inputStructure", { uri: this.client.code2ProtocolConverter.asUri(this.mapFile) });

        this.panel.webview.html = this.renderHtml();
        // if (this.disposed) {
        //     return;
        // }
    }

    private renderPreview() {
        const lines: InputLine[] = [];
        let inputLine = new InputLine();

        for (const element of this.structure.elements) {
            switch (element.kind) {
                case "newline":
                    lines.push(inputLine);
                    inputLine = new InputLine();
                    break;
                case "spaces":
                    inputLine.writeSpaces(element.spaces);
                    break;
                case "operand":
                    inputLine.writeElement(element.operand, element.length, element.id);
                    break;
                case "tabs":
                    inputLine.reposition(element.tabs);
                    break;
            }
        }
        lines.push(inputLine);

        for (let i = lines.length; i < 24; i++) {
            const line = new InputLine();
            line.writeElement(spaces(80));
            lines.push(line);
        }

        return lines
            .map(l => l.renderHtml())
            .join("\n");
    }



    private renderHtml(): string {
        const preview = this.renderPreview();
        return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Map Preview</title>
    <style>${this.createStylesheet()}</style>
  </head>
  <script>
        window.addEventListener('message', event => {
            const message = event.data;
            if (message.kind === "reveal") {
                console.log("Revealing", message.id);
                let selectedElements = document.getElementsByClassName("selected");
                if (selectedElements) {
                    Array.from(selectedElements).forEach(e => e.classList.remove("selected"));
                }

                const id = "element-" + message.id;
                console.log("Looking for", id);
                let selectedElement = document.getElementById(id);
                if (selectedElement) {
                    console.log("Element found");
                    selectedElement.classList.add("selected");
                } else {
                    console.log("Element not found");
                }
            }
        });
  </script>
  <body>
    <div id="map">
      ${preview}
    </div>
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

}

class InputLine {
    private position: number = 0;
    private content: string = "";
    private length: number = 0;

    reposition(column: number) {
        const previousPosition = this.position;
        const spacesToAdd = column - previousPosition;
        if (spacesToAdd > 0) {
            this.writeSpaces(spacesToAdd);
        }
    }

    writeSpaces(spacesToAdd: number) {
        this.length += spacesToAdd;
        this.position += spacesToAdd;
        this.content += `<span>${spaces(spacesToAdd)}`;
    }

    writeElement(content: string, length: number | undefined = undefined, id: number | undefined = undefined) {
        if (!length) {
            length = content.length;
        }

        this.length += length;
        this.position += length;
        let contentToRender = content.substring(0, length);

        let classes = "";
        let title = "";
        if (content.length > contentToRender.length) {
            classes += " cutoff";
            title = content;
        }

        if (contentToRender.length < length) {
            contentToRender += spaces(length - contentToRender.length);
        }

        const idAssign = id ? `id="element-${id}"` : "";
        this.content += `<span ${idAssign} class="${classes}" title=${title}>${contentToRender}</span>`;
    }

    renderHtml() {
        if (this.content.length === 0) {
            this.content = spaces(1);
        }
        return `<span>${this.content}</span><br/>`;
    }
}

function spaces(spaces: number): string {
    return "&emsp;".repeat(spaces);
}