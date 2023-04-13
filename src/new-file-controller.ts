import path = require('path');
import * as fs from 'fs';
import { promises as fsPromises } from 'fs';
import * as vscode from 'vscode';
import { DidCreateFilesNotification, LanguageClient } from 'vscode-languageclient/node';

export type FileType = 'SUBRPGORAM' | 'PROGRAM' | 'SUBROUTINE' | 'FUNCTION' | 'COPYCODE' | 'GDA' | 'LDA' | 'PDA';

let fileExtensions = new Map<FileType, string>([
    ['SUBRPGORAM', 'NSN'],
    ['PROGRAM', 'NSP'],
    ['SUBROUTINE', 'NSS'],
    ['FUNCTION', 'NS7'],
    ['COPYCODE', 'NSC'],
    ['GDA', 'NSG'],
    ['LDA', 'NSL'],
    ['PDA', 'NSA']
]);

export async function createFile(args: vscode.Uri | undefined, type: FileType, client: LanguageClient) {
    let folderPathToPutFileInto : string | undefined;
    if (!args) {
        if (vscode.window.activeTextEditor) {
            folderPathToPutFileInto = path.dirname(vscode.window.activeTextEditor.document.fileName);
        }
    } else {
        if (fs.lstatSync(args.fsPath).isDirectory()) {
            folderPathToPutFileInto = args.fsPath;
        } else {
            folderPathToPutFileInto = path.dirname(args.fsPath);
        }
    }

    if (!folderPathToPutFileInto) {
        vscode.window.showErrorMessage("Could not deduce folder path to put the file into. Open a file or use the Explorer.");
        return;
    }

    let name = await askForFilename();
    if (!name) {
        return;
    }
    name = name.toLocaleUpperCase();

    let subroutineName = '';
    if (type === 'SUBROUTINE') {
        const theSubroutineName = await askForSubroutineName();
        if (!theSubroutineName) {
            return;
        }
        subroutineName = theSubroutineName.toLocaleUpperCase();
    }

    const filePath = path.resolve(folderPathToPutFileInto, `${name}.${fileExtensions.get(type)}`);
    const content = fileTemplate(name, type, subroutineName);

    await fsPromises.appendFile(filePath, content);
    const vscodeUri = vscode.Uri.file(filePath);
    await vscode.workspace.openTextDocument(vscodeUri);
    await vscode.window.showTextDocument(vscodeUri);
    client.sendNotification(DidCreateFilesNotification.method, {
        files: [{
            uri: client.code2ProtocolConverter.asUri(vscodeUri)
        }]
    });
}

async function askForFilename() : Promise<string | undefined> {
    const name = await vscode.window.showInputBox(
        {
            title: 'File name',
            prompt: 'Enter a file name',
            validateInput: async (input) => {
                if (input.trim().length > 8) {
                    return {message: 'File name must have a length of 8 or less', severity: vscode.InputBoxValidationSeverity.Error};
                }
                if (input.trim().length === 0) {
                    return {message: 'File name must have a length of at least one character', severity: vscode.InputBoxValidationSeverity.Error};
                }
            }
        }
    );
    if (name && name.trim().length === 0) {
        return undefined;
    }
    return name?.trim();
}

function fileTemplate(fileName: string, type: FileType, subroutineName: string) : string {
    switch (type) {
        case 'SUBRPGORAM': {
            return `* >Natural Source Header 000000
* :Mode S
* :CP
* <Natural Source Header
DEFINE DATA
LOCAL
END-DEFINE

IGNORE

END
`;
        }
        case 'PROGRAM': {
            return `* >Natural Source Header 000000
* :Mode S
* :CP
* <Natural Source Header
DEFINE DATA
LOCAL
END-DEFINE

IGNORE

END
`;
        }
        case 'SUBROUTINE': {
            return `* >Natural Source Header 000000
* :Mode S
* :CP
* <Natural Source Header
DEFINE SUBROUTINE ${subroutineName}

IGNORE

END-SUBROUTINE
END
`;
        }
        case 'FUNCTION': {
            return `* >Natural Source Header 000000
* :Mode S
* :CP
* <Natural Source Header
DEFINE FUNCTION ${fileName}

RETURNS (L)

DEFINE DATA
LOCAL
END-DEFINE

IGNORE

END-FUNCTION
END
`;
        }
        case 'COPYCODE': {
            return `* >Natural Source Header 000000
* :Mode S
* :CP
* <Natural Source Header
IGNORE
`;
        }
        case 'GDA': {
            return `DEFINE DATA GLOBAL
/* >Natural Source Header 000000
/* :Mode S
/* :CP
/* <Natural Source Header
END-DEFINE
`;
        }
        case 'LDA': {
            return `DEFINE DATA LOCAL
/* >Natural Source Header 000000
/* :Mode S
/* :CP
/* <Natural Source Header
END-DEFINE
`;
        }
        case 'PDA': {
            return `DEFINE DATA PARAMETER
/* >Natural Source Header 000000
/* :Mode S
/* :CP
/* <Natural Source Header
END-DEFINE
`;
        }
    };
}

function getLibraryNameForPath(libraryPath: string) {
    let currentPath = libraryPath;
    let lastPath = currentPath;
    while (!currentPath.endsWith('Natural-Libraries')) {
        lastPath = currentPath;
        currentPath = path.parse(currentPath).dir;
    }

    return currentPath;
}

async function askForSubroutineName() {
    const name = await vscode.window.showInputBox(
        {
            title: 'Subroutine name',
            prompt: 'Enter a subroutine name',
            validateInput: async (input) => {
                if (input.trim().length === 0) {
                    return {message: 'Subroutine name must have a length of at least one character', severity: vscode.InputBoxValidationSeverity.Error};
                }
            }
        }
    );
    if (name && name.trim().length === 0) {
        return undefined;
    }
    return name?.trim();
}