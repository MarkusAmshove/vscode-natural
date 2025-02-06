import path = require("path");
import * as vscode from "vscode";
import {LanguageClient, LanguageClientOptions, ServerOptions} from "vscode-languageclient/node";
import * as ls from "vscode-languageserver-protocol";
import { registerDecoration } from "./decoration";
import { createFile, FileType } from "./new-file-controller";
import { NaturalStatementInlineCompletion } from "./completion/inlinecompletionprovider";
import { goToTest } from "./commands/gototest";
import { registerMapPreview } from "./preview/preview";

let client: LanguageClient;
let inlineCompletionProvider: vscode.Disposable | undefined;

export async function activate(context: vscode.ExtensionContext) {
	const config = vscode.workspace.getConfiguration("natls");
	let javaPath = config.get<string | null>("overwrite.java_path", null);
	let serverPath = config.get<string | null>("overwrite.server_path", null);
	const debugMode = config.get<boolean>("debug", false);
	const debugSuspend = config.get<boolean>("debugsuspend", false);

	if (!javaPath) {
		javaPath = context.asAbsolutePath(path.join("jre", "bin", "java"));
	}

	if (!serverPath) {
		serverPath = context.asAbsolutePath(path.join("server", "natls.jar"));
	}

	const suspendFlag = debugSuspend ? "y" : "n";
	const debugFlags = ["-Xdebug", `-Xrunjdwp:server=y,transport=dt_socket,address=8000,suspend=${suspendFlag},quiet=y`];
	const debugParameter = debugMode ? debugFlags : [];

	const serverOptions: ServerOptions = {
		run: {
			command: javaPath,
			args: [...debugParameter, "-jar", serverPath]
		},
		debug: {
			command: javaPath,
			args: [...debugFlags, "-jar", serverPath]
		}
	};

	const clientOptions: LanguageClientOptions = {
		documentSelector: ["natural"],
		synchronize: {
			fileEvents: [
				vscode.workspace.createFileSystemWatcher("**/Natural-Libraries/**/*.*"),
			],
			configurationSection: "natls"
		},
		progressOnInitialization: true,
		initializationOptions: config,
		diagnosticCollectionName: "natls",
	};

	client = new LanguageClient("natls", "Natural Language Server", serverOptions, clientOptions);
	await client.start();

	context.subscriptions.push(new vscode.Disposable(() => client.stop()));

	context.subscriptions.push(vscode.commands.registerCommand("natls.codelens.showReferences", async (_uri: string, position: ls.Range) => {
		const document = vscode.window.activeTextEditor?.document;
		if(!document)
		{
			return;
		}

		const vscodePosition = client.protocol2CodeConverter.asPosition(position.start);
		const references = await client.getFeature("textDocument/references").getProvider(document)?.provideReferences(document, vscodePosition, {includeDeclaration: false}, new vscode.CancellationTokenSource().token);
		if(!references)
		{
			return;
		}

		vscode.commands.executeCommand("editor.action.showReferences", document.uri, vscodePosition, references);
	}));

	context.subscriptions.push(vscode.commands.registerCommand("natls.codelens.goToTest", async (_u) => await goToTest(client)));

	context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
		if (!e.affectsConfiguration("natls")) {
			return;
		}

		if (inlineCompletionProvider && !shouldRegisterInlineCompletion()) {
			inlineCompletionProvider.dispose();
			inlineCompletionProvider = undefined;
		}

		if (!inlineCompletionProvider && shouldRegisterInlineCompletion()) {
			registerInlineCompletion();
		}
	}));

	registerDecoration(context);
	registerNewFileCommands(context);
	registerMapPreview(context, client);
	registerInsertConstantCommand(context, client);

	if (shouldRegisterInlineCompletion()) {
		registerInlineCompletion();
	}
}

export async function deactivate() {
	inlineCompletionProvider?.dispose();
	await client.stop();
}

function registerInsertConstantCommand(context: vscode.ExtensionContext, client: LanguageClient) {
	context.subscriptions.push(vscode.commands.registerTextEditorCommand("natls.insert.constant", async (editor, _) => {
		if (editor.document.languageId !== "natural") {
			return;
		}

		type FoundConstant = {name: string, source: string, value: string};
		const response : {constants : FoundConstant[]} = await client.sendRequest("findConstants", {identifier: client.code2ProtocolConverter.asTextDocumentIdentifier(editor.document)});
		const chosenConst = await vscode.window.showQuickPick(
			response.constants.map(c => (
				{
					label: `$(symbol-constant) ${c.name}`,
					type: vscode.QuickPickItemKind.Default,
					detail: c.value,
					description: c.source,
					const: c
				}
			)),
			{canPickMany: false, title: "Chose Constant", matchOnDetail: true, matchOnDescription: true}
		);

		if (!chosenConst) {
			return;
		}

		// The edit from registerTextEditorCommand can't be used, because of the await from "showQuickPick"
		await editor.edit(editBuilder => {
			editor.selections.forEach(s => editBuilder.replace(s, chosenConst.const.name));
		});
	}));
}

function registerNewFileCommands(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand("natural.file.new.subprogram", async (args) => {
		await createNewFileByTemplate(args, "SUBPROGRAM");
	}));
	context.subscriptions.push(vscode.commands.registerCommand("natural.file.new.program", async (args) => {
		await createNewFileByTemplate(args, "PROGRAM");
	}));
	context.subscriptions.push(vscode.commands.registerCommand("natural.file.new.copycode", async (args) => {
		await createNewFileByTemplate(args, "COPYCODE");
	}));
	context.subscriptions.push(vscode.commands.registerCommand("natural.file.new.function", async (args) => {
		await createNewFileByTemplate(args, "FUNCTION");
	}));
	context.subscriptions.push(vscode.commands.registerCommand("natural.file.new.gda", async (args) => {
		await createNewFileByTemplate(args, "GDA");
	}));
	context.subscriptions.push(vscode.commands.registerCommand("natural.file.new.lda", async (args) => {
		await createNewFileByTemplate(args, "LDA");
	}));
	context.subscriptions.push(vscode.commands.registerCommand("natural.file.new.pda", async (args) => {
		await createNewFileByTemplate(args, "PDA");
	}));
	context.subscriptions.push(vscode.commands.registerCommand("natural.file.new.subroutine", async (args) => {
		await createNewFileByTemplate(args, "SUBROUTINE");
	}));
	context.subscriptions.push(vscode.commands.registerCommand("natural.file.new.testcase", async (args) => {
		await createNewFileByTemplate(args, "TESTCASE");
	}));
}

function createNewFileByTemplate(args: any | undefined, type: FileType) {
	return createFile(args, type, client);
}

function registerInlineCompletion() {
	inlineCompletionProvider = vscode.languages.registerInlineCompletionItemProvider({language: "natural"}, new NaturalStatementInlineCompletion());
}

function shouldRegisterInlineCompletion() {
	const config = vscode.workspace.getConfiguration("natls.completion");
	return config.get<boolean>("inline", true);
}
