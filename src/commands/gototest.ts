import * as vscode from "vscode";
import * as path from "path";
import { LanguageClient } from "vscode-languageclient/node";
import { createFile } from "../new-file-controller";

export async function goToTest(client: LanguageClient) {
    const document = vscode.window.activeTextEditor?.document;
    if (!document) {
        return;
    }

    if (uriIsTestcase(document.uri)) {
        return await navigateToSut(document, client);
    }

    const vscodePosition = client.protocol2CodeConverter.asPosition(document.positionAt(0));
    const references = await client.getFeature("textDocument/references").getProvider(document)?.provideReferences(document, vscodePosition, { includeDeclaration: false }, new vscode.CancellationTokenSource().token);

    if (!references) {
        return;
    }

    const callingTests = references.filter(l => uriIsTestcase(l.uri));

    // No Tests found, ask if we want to create a test case
    if (callingTests.length === 0) {
        const createTestPrompt = await vscode.window.showQuickPick(["Yes", "No"], { canPickMany: false, title: "No test case found. Create one?" });
        if (createTestPrompt !== "Yes") {
            return;
        }
        await createFile(undefined, "TESTCASE", client);
        return;
    }

    const callingTestCases : string[] = [...new Set(callingTests.map(l => l.uri.fsPath))];

    if (callingTestCases.length === 1) {
        // There is only one test case, so navigate to it
        await vscode.window.showTextDocument(vscode.Uri.file(callingTestCases[0]));
        return;
    }
    else {
        // There are more than one testcases, so show actual calling locations
        // to have a better context when chosing where to navigate to.
        await vscode.commands.executeCommand("editor.action.showReferences", document.uri, vscodePosition, callingTests);
    }
};

async function navigateToSut(document: vscode.TextDocument, client: LanguageClient) {
    const response: { uris: string[] } = await client.sendRequest("calledModules", { identifier: client.code2ProtocolConverter.asTextDocumentIdentifier(document) });
    const paths = response.uris.map(u => client.protocol2CodeConverter.asUri(u).fsPath);
    const possibleSuts = paths.filter(p => couldBeSut(p));

    if (possibleSuts.length === 1) {
        await vscode.window.showTextDocument(vscode.Uri.file(possibleSuts[0]));
        return;
    }

    const folderPathOfCurrentFile = path.dirname(document.uri.fsPath);
    possibleSuts.sort((a, b) => {
        const folderPathOfA = path.dirname(a);
        const folderPathOfB = path.dirname(b);

        const numberOfMatchingCharactersOfA = getMatchingPrefixCount(folderPathOfA, folderPathOfCurrentFile);
        const numberOfMatchingCharactersOfB = getMatchingPrefixCount(folderPathOfB, folderPathOfCurrentFile);
        return numberOfMatchingCharactersOfB - numberOfMatchingCharactersOfA;
    });

    const namesToPaths = new Map<string, string>();
    possibleSuts.forEach(p => {
        const filename = path.basename(p);
        namesToPaths.set(filename, p);
    });

    const chosenSut = await vscode.window.showQuickPick(possibleSuts.map(p => path.basename(p)), {canPickMany: false, title: "Chose module to open"});
    if (chosenSut) {
        await vscode.window.showTextDocument(vscode.Uri.file(namesToPaths.get(chosenSut)!));
    }
};

function getMatchingPrefixCount(pathA: string, pathB: string) {
    let matches = 0;
    for(let i = 0; i < pathA.length; i++) {
        if (pathB.length <= i) {
            break;
        }
        if (pathA.charAt(i) === pathB.charAt(i)) {
            matches++;
        }
    }

    return matches;
}

function uriIsTestcase(uri: vscode.Uri): boolean {
    return pathIsTestcase(uri.fsPath);
}

function pathIsTestcase(filePath: string): boolean {
    const filename = path.basename(filePath);
    return filename.startsWith("TC") && filename.endsWith(".NSN");
}

function couldBeSut(filePath: string): boolean {
    const filename = path.basename(filePath);
    return !pathIsTestcase(filePath)
        && !(filename.startsWith("ASS") && filename.endsWith(".NSS")) // assertions
        && !(filename.endsWith(".NSL") || filename.endsWith(".NSA") || filename.endsWith(".NSG")) // data areas
        && !(filename === "NUERRMSG.NSS")
        && !(filename.endsWith(".NSC")); // copy codes
}