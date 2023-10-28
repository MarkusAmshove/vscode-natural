import path = require('path');
import * as vscode from 'vscode';
import {LanguageClient, LanguageClientOptions, ServerOptions} from "vscode-languageclient/node";
import * as ls from 'vscode-languageserver-protocol';
import { registerDecoration } from './decoration';
import { createFile, FileType } from './new-file-controller';
import { NaturalStatementInlineCompletion } from './completion/inlinecompletionprovider';

let client: LanguageClient;
let inlineCompletionProvider: vscode.Disposable | undefined;

export async function activate(context: vscode.ExtensionContext) {
	const config = vscode.workspace.getConfiguration('natls');
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

	const suspendFlag = debugSuspend ? 'y' : 'n';
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
				vscode.workspace.createFileSystemWatcher("**/build/test-results/**/*.xml"),
				vscode.workspace.createFileSystemWatcher("**/build/stow.log")
			],
			configurationSection: 'natls'
		},
		progressOnInitialization: true,
		initializationOptions: config,
	};

	client = new LanguageClient('natls', 'Natural Language Server', serverOptions, clientOptions);
	await client.start();

	context.subscriptions.push(new vscode.Disposable(() => client.stop()));

	context.subscriptions.push(vscode.commands.registerCommand('natls.codelens.showReferences', async (uri: string, position: ls.Range) => {
		const document = vscode.window.activeTextEditor?.document;
		if(!document)
		{
			return;
		}

		const vscodePosition = client.protocol2CodeConverter.asPosition(position.start);
		const references = await client.getFeature('textDocument/references').getProvider(document)?.provideReferences(document, vscodePosition, {includeDeclaration: false}, new vscode.CancellationTokenSource().token);
		if(!references)
		{
			return;
		}

		vscode.commands.executeCommand('editor.action.showReferences', document.uri, vscodePosition, references);
	}));

	context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
		if (!e.affectsConfiguration('natls')) {
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

	if (shouldRegisterInlineCompletion()) {
		registerInlineCompletion();
	}
}

export async function deactivate() {
	inlineCompletionProvider?.dispose();
	await client.stop();
}

function registerNewFileCommands(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand('natural.file.new.subprogram', async (args) => {
		await createNewFileByTemplate(args, 'SUBRPGORAM');
	}));
	context.subscriptions.push(vscode.commands.registerCommand('natural.file.new.program', async (args) => {
		await createNewFileByTemplate(args, 'PROGRAM');
	}));
	context.subscriptions.push(vscode.commands.registerCommand('natural.file.new.copycode', async (args) => {
		await createNewFileByTemplate(args, 'COPYCODE');
	}));
	context.subscriptions.push(vscode.commands.registerCommand('natural.file.new.function', async (args) => {
		await createNewFileByTemplate(args, 'FUNCTION');
	}));
	context.subscriptions.push(vscode.commands.registerCommand('natural.file.new.gda', async (args) => {
		await createNewFileByTemplate(args, 'GDA');
	}));
	context.subscriptions.push(vscode.commands.registerCommand('natural.file.new.lda', async (args) => {
		await createNewFileByTemplate(args, 'LDA');
	}));
	context.subscriptions.push(vscode.commands.registerCommand('natural.file.new.pda', async (args) => {
		await createNewFileByTemplate(args, 'PDA');
	}));
	context.subscriptions.push(vscode.commands.registerCommand('natural.file.new.subroutine', async (args) => {
		await createNewFileByTemplate(args, 'SUBROUTINE');
	}));
	context.subscriptions.push(vscode.commands.registerCommand('natural.file.new.testcase', async (args) => {
		await createNewFileByTemplate(args, 'TESTCASE');
	}));
}

function createNewFileByTemplate(args: any, type: FileType) {
	return createFile(args, type, client);
}

function registerInlineCompletion() {
	inlineCompletionProvider = vscode.languages.registerInlineCompletionItemProvider({language: 'natural'}, new NaturalStatementInlineCompletion());
}

function shouldRegisterInlineCompletion() {
	const config = vscode.workspace.getConfiguration('natls.completion');
	return config.get<boolean>('inline', true);
}