import * as vscode from 'vscode';
import { provideInlineCompletion } from './inlinecompletion';

export class NaturalStatementInlineCompletion implements vscode.InlineCompletionItemProvider {
    provideInlineCompletionItems(document: vscode.TextDocument, position: vscode.Position, context: vscode.InlineCompletionContext, token: vscode.CancellationToken): vscode.ProviderResult<vscode.InlineCompletionItem[] | vscode.InlineCompletionList> {
        const lineContent = document.getText(new vscode.Range(new vscode.Position(position.line, 0), position));
        const lineContentToCursor = lineContent.substring(0, position.character);
        const lastWord = lineContentToCursor.split(' ').pop();

        const result = new vscode.InlineCompletionList([]);

        if (!lastWord) {
            return result;
        }

        provideInlineCompletion(lineContentToCursor, lastWord)
            .forEach(snippet => {
                result.items.push(new vscode.InlineCompletionItem(
                    new vscode.SnippetString(snippet),
                    new vscode.Range(position, position)
                ));
            });

        return result;
    }

};
