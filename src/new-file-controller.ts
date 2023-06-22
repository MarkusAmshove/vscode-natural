import path = require('path');
import * as fs from 'fs';
import { promises as fsPromises } from 'fs';
import * as vscode from 'vscode';
import { DidChangeTextDocumentNotification, DidCreateFilesNotification, DidSaveTextDocumentNotification, LanguageClient } from 'vscode-languageclient/node';

export type FileType = 'SUBRPGORAM' | 'PROGRAM' | 'SUBROUTINE' | 'FUNCTION' | 'COPYCODE' | 'GDA' | 'LDA' | 'PDA' | 'TESTCASE';

let fileExtensions = new Map<FileType, string>([
    ['SUBRPGORAM', 'NSN'],
    ['PROGRAM', 'NSP'],
    ['SUBROUTINE', 'NSS'],
    ['FUNCTION', 'NS7'],
    ['COPYCODE', 'NSC'],
    ['GDA', 'NSG'],
    ['LDA', 'NSL'],
    ['PDA', 'NSA'],
    ['TESTCASE', 'NSN']
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

    let fileName = type !== 'TESTCASE'
        ? await promptForInput('File name', 'Enter a file name', {inputMaxLength: 8})
        : await promptForInput('File name', 'Enter a file name', {inputMaxLength: 8, namePrefix: 'TC'});

    if (!fileName) {
        return;
    }
    fileName = fileName.toLocaleUpperCase();

    let subroutineName = '';
    if (type === 'SUBROUTINE') {
        const theSubroutineName = await promptForInput('Subroutine name', 'Enter a subroutine name');
        if (!theSubroutineName) {
            return;
        }
        subroutineName = theSubroutineName.toLocaleUpperCase();
    }

    const referableName = type === 'SUBROUTINE' ? subroutineName : fileName;
    const referableModuleAlreadyExists = await referableNameExistsInLibrary(getLibraryNameForPath(folderPathToPutFileInto), referableName, client);
    if (referableModuleAlreadyExists) {
        vscode.window.showErrorMessage(`Module with referable name ${referableName} already exists in library.`);
        return;
    }

    const filePath = path.resolve(folderPathToPutFileInto, `${fileName}.${fileExtensions.get(type)}`);
    const content = fileTemplate(fileName, type, subroutineName);

    await fsPromises.appendFile(filePath, content);
    const vscodeUri = vscode.Uri.file(filePath);
    await vscode.workspace.openTextDocument(vscodeUri);
    await vscode.window.showTextDocument(vscodeUri);
    await client.sendNotification(DidCreateFilesNotification.method, {
        files: [{
            uri: client.code2ProtocolConverter.asUri(vscodeUri)
        }]
    });
    await client.sendNotification(DidSaveTextDocumentNotification.method, {
        textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(vscode.window.activeTextEditor!.document)
    });
}

type ValidationOptions = {inputMaxLength?: number, namePrefix?: string};
async function promptForInput(title: string, prompt: string, validationOptions: ValidationOptions = {}) {
    const name = await vscode.window.showInputBox(
        {
            title: title,
            prompt: prompt,
            validateInput: (input) => {
                if (validationOptions.inputMaxLength && input.trim().length > validationOptions.inputMaxLength) {
                    return {message: 'Name must have a length of 8 or less', severity: vscode.InputBoxValidationSeverity.Error};
                }

                if (input.trim().length === 0) {
                    return {message: 'Name must have a length of at least one character', severity: vscode.InputBoxValidationSeverity.Error};
                }

                if (validationOptions.namePrefix && !input.trim().toLocaleUpperCase().startsWith(validationOptions.namePrefix)) {
                    return {message: `Name must have prefix ${validationOptions.namePrefix}`, severity: vscode.InputBoxValidationSeverity.Error};
                }
            }
        }
    );

    if (name && name.trim().length === 0) {
        return undefined;
    }

    return name?.trim();
}

function moduleDocumentationHeader() {
    return `/***********************************************************************
/**
/** TODO: Documentation
/**
/** :since ${new Date().toLocaleDateString()}
/** :author ${require('os').userInfo().username}
/**
/***********************************************************************`;
}

function fileTemplate(fileName: string, type: FileType, subroutineName: string) : string {
    switch (type) {
        case 'SUBRPGORAM': {
            return `* >Natural Source Header 000000
* :Mode S
* :CP
* <Natural Source Header
${moduleDocumentationHeader()}
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
${moduleDocumentationHeader()}
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
${moduleDocumentationHeader()}
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
${moduleDocumentationHeader()}
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
        case 'TESTCASE': {
            return `* >Natural Source Header 000000
* :Mode S
* :CP
* <Natural Source Header
${moduleDocumentationHeader()}
DEFINE DATA

PARAMETER USING NUTESTP

LOCAL USING NUCONST
LOCAL USING NUASSP
END-DEFINE

NUTESTP.FIXTURE := 'The fixture should'

INCLUDE NUTCTEMP

DEFINE SUBROUTINE TEST

/***********************************************************************
IF NUTESTP.TEST EQ 'Pass'
/***********************************************************************

ASSERT-LINE := *LINE; PERFORM ASSERT-NUM-EQUALS NUASSP 5 5

END-IF

END-SUBROUTINE

END
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

    return path.parse(lastPath).name;
}

async function referableNameExistsInLibrary(libraryName: string, referableName: string, client: LanguageClient) : Promise<boolean> {
    const response : {fileAlreadyExists: boolean} = await client.sendRequest('referableFileExists', { library: libraryName, referableName: referableName});
    return response.fileAlreadyExists;
}
