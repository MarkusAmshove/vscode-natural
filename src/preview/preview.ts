import { basename } from "path";
import * as vscode from "vscode";
import { LanguageClient } from "vscode-languageclient/node";
import { InputOperand, InputStructure } from "./previewTypes";

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

    context.subscriptions.push(vscode.commands.registerCommand(
        "natls.previewInput",
        (params: { uri: string, inputIndex: number }) => {
            const uri = vscode.Uri.parse(params.uri);
            const mapName = basename(uri.fsPath);
            const panel = vscode.window.createWebviewPanel("natura.map", mapName, vscode.ViewColumn.Beside, { enableScripts: true });

            const preview = new MapPreview(panel, uri, client, params.inputIndex);
        }
    ));
}

class MapPreview {
    private inputThrottle: NodeJS.Timeout | undefined;
    private isFirstUpdate = true;
    private lineSize = 80;
    private pageSize = 24;
    private structure: InputStructure = null!;

    constructor(private panel: vscode.WebviewPanel, private mapFile: vscode.Uri, private client: LanguageClient, private inputIndex = 0) {
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

        panel.webview.onDidReceiveMessage(async m => {
            if (!this.structure) {
                return;
            }

            if (m.kind === "doubleclick" && m.target) {
                const elementId: string = m.target;
                const targetElement = this.structure.elements.find(e => e.kind === "operand" && e.id === Number.parseInt(elementId.replace("element-", ""))) as InputOperand | undefined;
                if (!targetElement) {
                    return;
                }

                const highlightElement = async (editor: vscode.TextEditor) => {
                    await vscode.window.showTextDocument(editor.document, {
                        selection: new vscode.Range(
                            new vscode.Position(targetElement.sourceLine, targetElement.sourceColumnStart),
                            new vscode.Position(targetElement.sourceLine, targetElement.sourceColumnEnd)
                        ),
                        viewColumn: editor.viewColumn,
                    });
                };

                const editor = vscode.window.visibleTextEditors.find(e => this.isPreviewOf(e.document.uri));
                if (editor) {
                    await highlightElement(editor);
                    return;
                }

                const document = await vscode.workspace.openTextDocument(this.mapFile);
                const openedEditor = await vscode.window.showTextDocument(document, vscode.ViewColumn.Beside);
                await highlightElement(openedEditor);
            }
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

        this.structure = await this.client.sendRequest<InputStructure>("inputStructure", { uri: this.client.code2ProtocolConverter.asUri(this.mapFile), inputIndex: this.inputIndex });

        if (this.isFirstUpdate) {
            this.panel.webview.html = this.renderHtml();
            this.isFirstUpdate = false;
        } else {
            const preview = this.renderPreview();
            this.panel.webview.postMessage({
                kind: "update",
                source: preview,
            });
        }
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
                    inputLine.writeOperand(element);
                    break;
                case "tabs":
                    inputLine.reposition(element.tabs);
                    break;
            }
        }
        lines.push(inputLine);

        for (let i = lines.length; i < 24; i++) {
            lines.push(new InputLine());
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
    <script>
        const vscode = acquireVsCodeApi();
        let fontSize = 100;
        let fontIncrement = 25;

        window.addEventListener('message', event => {
            const message = event.data;
            console.log("Got Message", message.kind);
            if (message.kind === "reveal") {
                let selectedElements = document.getElementsByClassName("selected");
                if (selectedElements) {
                    Array.from(selectedElements).forEach(e => e.classList.remove("selected"));
                }

                const id = "element-" + message.id;
                let selectedElement = document.getElementById(id);
                if (selectedElement) {
                    selectedElement.classList.add("selected");
                }
            }

            if (message.kind === "update") {
                console.log("Update");
                document.getElementById("map").innerHTML = message.source;
            }
        });

        document.addEventListener("dblclick", e => {
            vscode.postMessage({
                kind: "doubleclick",
                target: e.target.id,
            })
        });

        function updateFontSize() {
            document.getElementById("map").style.fontSize = fontSize + "%";
            document.getElementById("currentZoom").textContent = fontSize + "%";
        }

        function increaseFontSize() {
            fontSize += fontIncrement;
            updateFontSize();
        }

        function decreaseFontSize() {
            fontSize -= fontIncrement;
            updateFontSize();
        }
    </script>
  </head>
  <body>
    <div id="zoom-area">
        <button onclick="decreaseFontSize()">-</button>
        <span id="currentZoom">100%</span>
        <button onclick="increaseFontSize()">+</button>
    </div>
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
    white-space: nowrap;
	font-family: monospace;
}

#map {
	background: gray;
    border: solid 1px;
    border-color: ${isDark ? "white" : "black"};
    width: ${this.lineSize}ch;
}

.selected {
	outline: solid 2px !important;
	outline-color: red !important;
}

.cutoff {
  position: relative;
  display: inline-block;
  border-bottom: 1px dotted black;
}

.operand-unknown, .operand-undefined {
    color: white;
}

.operand-reference {
    outline: solid 1px;
    outline-color: black;
}

.ad-d, .operand-literal {
    color: rgb(0,0,187);
}

.ad-i {
    color: rgb(187,0,0);
}

.ad-l {
    text-align: left;
}

.ad-z, .ad-r {
    text-align: right;
}

.ad-u {
    text-decoration: underline;
}

.ad-b {
    animation: blinker 1s step-start infinite;
}

.ad-c {
    font-style: italic;
}

@keyframes blinker {
    50% {
        opacity: 0;
    }
}
`;
    }

}

const SPACE_IN_VIEW = "&nbsp;"

class InputLine {
    private position: number = 1;
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
        this.content += `<span>${spaces(spacesToAdd)}</span>`;
    }

    writeOperand(operand: InputOperand) {
        const content = operand.operand;
        const length = operand.length;
        const id = operand.id;

        this.position += length;
        this.length += length;
        let contentToRender = content.substring(0, length);

        let classes = [];
        let title = "";
        if (content.length > contentToRender.length) {
            classes.push("cutoff");
            title = content;
        }

        classes.push(`operand-${operand.type}`);

        let isRightAligned = false;
        for (const attribute of operand.attributes) {
            if (attribute.kind === "AD") {
                for (let i = 0; i < attribute.value.length; i++) {
                    const value = attribute.value[i].toLowerCase();
                    if (value === "r" || value === "z") {
                        isRightAligned = true;
                    }
                    classes.push(`ad-${value}`);
                }
            }
            // ....
        }

        if (contentToRender.length < length) {
            const spacesToAdd = length - contentToRender.length;
            const theSpaces = spaces(spacesToAdd);
            if (isRightAligned) {
                contentToRender = theSpaces + contentToRender;
            } else {
                contentToRender += theSpaces;
            }
        }

        const idAssign = id ? `id="element-${id}"` : "";
        this.content += `<span ${idAssign} class="${classes.join(" ")}" title=${title}>${contentToRender.replace(/ /g, SPACE_IN_VIEW)}</span>`;
    }

    renderHtml() {
        if (this.content.length === 0) {
            this.content = spaces(1);
        }
        return `${this.content}<br/>`;
    }
}

function spaces(spaces: number): string {
    return SPACE_IN_VIEW.repeat(spaces);
}