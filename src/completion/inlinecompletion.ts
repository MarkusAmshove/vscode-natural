import * as vscode from 'vscode';

type NaturalInlineCompletionSnippet = {
    trigger: string,
    snippet: string
}

const snippets : NaturalInlineCompletionSnippet[] = [
    {
        trigger: 'comp',
        snippet: 'COMPRESS ${1:#VAR} INTO ${2:#TARGET}'
    },
    {
        trigger: 'comp',
        snippet: 'COMPRESS NUMERIC ${1:#VAR} INTO ${2:#TARGET}'
    },
    {
        trigger: 'separ',
        snippet: "SEPARATE ${1:#ALPHANUMERIC} INTO ${2:#GROUP} WITH DELIMITERS ${3:';'}"
    },
    {
        trigger: 'if',
        snippet: 'IF ${1:TRUE}\n  ${0:IGNORE}\nEND-IF'
    },
    {
        trigger: 'if',
        snippet: 'IF ${1:TRUE}\n  ${2:IGNORE}\nELSE\nVj  ${3:IGNORE}\nEND-IF'
    },
    {
        trigger: 'exp',
        snippet: "EXPAND ARRAY ${1:#ARRAY} TO (${2:1:*})"
    },
    {
        trigger: 'red',
        snippet: "REDUCE ARRAY ${1:#ARRAY} TO ${2:0}"
    },
    {
        trigger: 'res',
        snippet: "RESIZE ARRAY ${1:#ARRAY} TO (${2:1:*})"
    },
    {
        trigger: 'exa',
        snippet: "EXAMINE ${1:#TEXT} FOR ${2:#SEARCHED} GIVING NUMBER ${3:#NUMBER}"
    },
    {
        trigger: 'exa',
        snippet: "EXAMINE ${1:#TEXT} FOR ${2:#SEARCHED} REPLACE FIRST WITH ${3:#REPLACEMENT}"
    },
    {
        trigger: 'exa',
        snippet: "EXAMINE ${1:#TEXT} FOR ${2:#SEARCHED} REPLACE WITH ${3:#REPLACEMENT}"
    },
    {
        trigger: 'exa',
        snippet: "EXAMINE ${1:#TEXT} FOR ${2:#SEARCHED} DELETE FIRST"
    },
    {
        trigger: 'exa',
        snippet: "EXAMINE ${1:#TEXT} FOR ${2:#SEARCHED} DELETE"
    },
    {
        trigger: 'for',
        snippet: 'FOR ${1:#I} := 1 TO ${2:#UPPER}\n  ${0:IGNORE}\nEND-FOR'
    },
    {
        trigger: 'mov',
        snippet: 'MOVE BY NAME ${1:#FIRST} TO ${2:#SECOND}'
    }
];

export class NaturalStatementInlineCompletion implements vscode.InlineCompletionItemProvider {
    provideInlineCompletionItems(document: vscode.TextDocument, position: vscode.Position, context: vscode.InlineCompletionContext, token: vscode.CancellationToken): vscode.ProviderResult<vscode.InlineCompletionItem[] | vscode.InlineCompletionList> {
        const lineContent = document.getText(new vscode.Range(new vscode.Position(position.line, 0), position));
        const lineContentToCursor = lineContent.substring(0, position.character);
        const lastWord = lineContentToCursor.split(' ').pop();

        const result = new vscode.InlineCompletionList([]);

        if (!lastWord) {
            return result;
        }

        const statementToComplete = lastWord;

        for (const snippet of snippets) {
            if (statementToComplete.toLowerCase().startsWith(snippet.trigger)) {
                const firstWordOfStatement = snippet.snippet.split(' ')[0];
                const missingPartsOfFirstKeyword = firstWordOfStatement.substring(lastWord.length);
                const restOfSnippet = snippet.snippet.split(' ').slice(1).join(' ');
                result.items.push(new vscode.InlineCompletionItem(
                    new vscode.SnippetString(`${lastWord}${missingPartsOfFirstKeyword} ${restOfSnippet}`),
                    new vscode.Range(
                        position.with(undefined, position.character - lastWord.length),
                        position
                    )
                ));
            }
        }

        // if (statementToComplete.toLowerCase().startsWith("comp")) {
        //     const rest = "COMPRESS".substring(lastWord.length);
        //     result.items.push(
        //         new vscode.InlineCompletionItem(
        //             new vscode.SnippetString(`${lastWord}${rest} \${1:#VAR} INTO \${2:#TARGET}`),
        //             new vscode.Range(
        //                 position.with(undefined, position.character - lastWord.length),
        //                 position
        //             )
        //         )
        //     );
        //     result.items.push(
        //         new vscode.InlineCompletionItem(
        //             new vscode.SnippetString(`${lastWord}${rest} \${1:#VAR} INTO \${2:#TARGET} LEAVING NO`),
        //             new vscode.Range(
        //                 position.with(undefined, position.character - lastWord.length),
        //                 position
        //             )
        //         )
        //     );
        // }

        return result;
    }

};