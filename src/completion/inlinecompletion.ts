type NaturalInlineCompletionSnippet = {
    kind: 'statement' | 'expression';
    trigger: string,
    snippet: string
};

const snippets: NaturalInlineCompletionSnippet[] = [
    {
        kind: 'statement',
        trigger: 'comp',
        snippet: 'COMPRESS ${1:#VAR} INTO ${2:#TARGET}'
    },
    {
        kind: 'statement',
        trigger: 'comp',
        snippet: 'COMPRESS NUMERIC ${1:#VAR} INTO ${2:#TARGET}'
    },
    {
        kind: 'statement',
        trigger: 'sep',
        snippet: "SEPARATE ${1:#ALPHANUMERIC} INTO ${2:#GROUP} WITH DELIMITERS ${3:';'}"
    },
    {
        kind: 'statement',
        trigger: 'if',
        snippet: 'IF ${1:TRUE}\n  ${0:IGNORE}\nEND-IF'
    },
    {
        kind: 'statement',
        trigger: 'if',
        snippet: 'IF ${1:TRUE}\n  ${2:IGNORE}\nELSE\nVj  ${3:IGNORE}\nEND-IF'
    },
    {
        kind: 'statement',
        trigger: 'exp',
        snippet: "EXPAND ARRAY ${1:#ARRAY} TO (${2:1:*})"
    },
    {
        kind: 'statement',
        trigger: 'red',
        snippet: "REDUCE ARRAY ${1:#ARRAY} TO ${2:0}"
    },
    {
        kind: 'statement',
        trigger: 'res',
        snippet: "RESIZE ARRAY ${1:#ARRAY} TO (${2:1:*})"
    },
    {
        kind: 'statement',
        trigger: 'exa',
        snippet: "EXAMINE ${1:#TEXT} FOR ${2:#SEARCHED} GIVING NUMBER ${3:#NUMBER}"
    },
    {
        kind: 'statement',
        trigger: 'exa',
        snippet: "EXAMINE ${1:#TEXT} FOR ${2:#SEARCHED} REPLACE FIRST WITH ${3:#REPLACEMENT}"
    },
    {
        kind: 'statement',
        trigger: 'exa',
        snippet: "EXAMINE ${1:#TEXT} FOR ${2:#SEARCHED} REPLACE WITH ${3:#REPLACEMENT}"
    },
    {
        kind: 'statement',
        trigger: 'exa',
        snippet: "EXAMINE ${1:#TEXT} FOR ${2:#SEARCHED} DELETE FIRST"
    },
    {
        kind: 'statement',
        trigger: 'exa',
        snippet: "EXAMINE ${1:#TEXT} FOR ${2:#SEARCHED} DELETE"
    },
    {
        kind: 'statement',
        trigger: 'for',
        snippet: 'FOR ${1:#I} := 1 TO ${2:#UPPER}\n  ${0:IGNORE}\nEND-FOR'
    },
    {
        kind: 'statement',
        trigger: 'mov',
        snippet: 'MOVE BY NAME ${1:#FIRST} TO ${2:#SECOND}'
    },
    {
        kind: 'statement',
        trigger: 'def',
        snippet: 'DEFINE WORK FILE ${1:1} ${2:#PATH}'
    },
    {
        kind: 'statement',
        trigger: 'clos',
        snippet: 'CLOSE WORK FILE ${1:1}'
    },
    {
        kind: 'statement',
        trigger: 'writ',
        snippet: 'WRITE ${1:#VAR}'
    },
    {
        kind: 'statement',
        trigger: 'writ',
        snippet: 'WRITE WORK FILE ${1:1}'
    },
    {
        kind: 'expression',
        trigger: 'subs',
        snippet: 'SUBSTRING(${1:#STRING}, ${2:1})'
    },
    {
        kind: 'expression',
        trigger: 'subs',
        snippet: 'SUBSTRING(${1:#STRING}, ${2:1}, ${3:2})'
    }
];

export function provideInlineCompletion(currentLine: string, currentWord: string): string[] {
    const result: string[] = [];
    const trimmedLine = currentLine.trim();

    for (const snippet of snippets) {
        if (snippet.kind === "statement") {
            if (trimmedLine.trim().toLowerCase().startsWith(snippet.trigger) && trimmedLine.length < snippet.snippet.length) {
                if (snippet.snippet.startsWith(trimmedLine.toUpperCase())) {
                    const missingSnippetPart = snippet.snippet.substring(trimmedLine.length);
                    result.push(missingSnippetPart);
                    continue;
                }
            }
        }
        else {
            if (currentWord.toLowerCase().startsWith(snippet.trigger)) {
                const firstWordOfStatement = snippet.snippet.split(' ')[0];
                const missingPartsOfFirstKeyword = firstWordOfStatement.substring(currentWord.length);
                const restOfSnippet = snippet.snippet.split(' ').slice(1).join(' ');
                result.push(`${missingPartsOfFirstKeyword} ${restOfSnippet}`);
            }
        }
    }

    return result;
}