import { TextDocument, window } from "vscode";

export class FoldingDecorator {

	async updateFolding(document: TextDocument) {
        const ranges = window.activeTextEditor;
        for (let lineNo = 0; lineNo < document.lineCount; lineNo++) {
            const line = document.lineAt(lineNo);
        }
	}

    dispose() {}
};