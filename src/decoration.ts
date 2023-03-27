import * as vscode from 'vscode';

export function registerDecoration(context: vscode.ExtensionContext) {

	let timeout: NodeJS.Timer | undefined = undefined;

    const subroutineDecorator = vscode.window.createTextEditorDecorationType({
        isWholeLine: true,
        gutterIconPath: context.asAbsolutePath('images/gutter-nested.svg'),
    });

    const toplevelDecorator = vscode.window.createTextEditorDecorationType({
        isWholeLine: true,
        gutterIconPath: context.asAbsolutePath('images/gutter-top.svg'),
    });


    let activeEditor = vscode.window.activeTextEditor;

    function updateDecorations() {
        if (!activeEditor) {
            return;
        }

        decorateFile(activeEditor, toplevelDecorator, subroutineDecorator);
    }

    function triggerUpdate(throttle = false) {
        if (timeout) {
            clearTimeout(timeout);
            timeout = undefined;
        }

        if (throttle) {
            timeout = setTimeout(updateDecorations, 500);
        }
        else {
            updateDecorations();
        }
    }

    if (activeEditor) {
        triggerUpdate();
    }

    vscode.window.onDidChangeActiveTextEditor(e => {
        activeEditor = e;
        if (activeEditor) {
            triggerUpdate();
        }
    }, null, context.subscriptions);

    vscode.workspace.onDidChangeTextDocument(d => {
        if (activeEditor && d.document === activeEditor.document) {
            triggerUpdate(true);
        }
    }, null, context.subscriptions);
}

const defineDataPattern = /^\s*DEFINE\s*DATA/
const endDefinePattern = /^\s*END-DEFINE/
const defineSubroutinePattern = /^\s*DEFINE\s*SUBROUTINE\s*(.+)/
const endSubroutinePattern = /^\s*END-SUBROUTINE/

function decorateFile(editor: vscode.TextEditor, toplevelDecorator: vscode.TextEditorDecorationType, subroutineDecorator: vscode.TextEditorDecorationType) {
    const subroutineDecorations : vscode.DecorationOptions[] = [];
    const toplevelDecorations : vscode.DecorationOptions[] = [];

    const lines = editor.document.getText().split('\n');

    let hasDefineData = false;
    let endDefineFound = false;
    let subroutineStart : number | undefined;
    let subroutineName : string | undefined;
    for (let lineNr = 0; lineNr < lines.length; lineNr++) {
        const line = lines[lineNr];

        if (line.match(defineDataPattern)) {
            hasDefineData = true;
        }

        if (line.match(endDefinePattern)) {
            endDefineFound = true;
            continue;
        }

        if (hasDefineData && !endDefineFound) {
            continue;
        }

        const subroutine = line.match(defineSubroutinePattern);
        if (subroutine) {
            subroutineStart = lineNr;
            subroutineName = subroutine[1];
            continue;
        }

        if (line.match(endSubroutinePattern)) {
            subroutineDecorations.push({ range: new vscode.Range(new vscode.Position(subroutineStart!, 0), new vscode.Position(lineNr, 0)), hoverMessage: subroutineName});
            subroutineStart = undefined;
            subroutineName = undefined;
            continue;
        }

        const trimmed = line.trimStart();
        if (trimmed.length > 0 && !line.startsWith("*") && !trimmed.startsWith("/*")) {
            toplevelDecorations.push({ range: new vscode.Range(new vscode.Position(lineNr, 0), new vscode.Position(lineNr, 0)), hoverMessage: "Top level"});
        }
    }

    editor.setDecorations(subroutineDecorator, subroutineDecorations);
    editor.setDecorations(toplevelDecorator, toplevelDecorations);
}
