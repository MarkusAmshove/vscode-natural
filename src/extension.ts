import path = require('path');
import * as vscode from 'vscode';
import {LanguageClient, LanguageClientOptions, ServerOptions} from "vscode-languageclient/node";
import * as ls from 'vscode-languageserver-protocol';

let client: LanguageClient;

export async function activate(context: vscode.ExtensionContext) {
	const config = vscode.workspace.getConfiguration('natls');
	let javaPath = config.get<string | null>("overwrite.java_path", null);
	let serverPath = config.get<string | null>("overwrite.server_path", null);

	if (!javaPath) {
		javaPath = context.asAbsolutePath(path.join("jre", "bin", "java"));
	}

	if (!serverPath) {
		serverPath = context.asAbsolutePath(path.join("server", "natls.jar"));
	}

	const serverOptions: ServerOptions = {
		run: {
			command: javaPath,
			args: ["-jar", serverPath]
		},
		debug: {
			command: javaPath,
			args: ["-Xdebug", "-Xrunjdwp:server=y,transport=dt_socket,address=8000,suspend=n,quiet=y", "-jar", serverPath]
		}
	};

	const clientOptions: LanguageClientOptions = {
		documentSelector: ["natural"],
		synchronize: {
			fileEvents: [
				vscode.workspace.createFileSystemWatcher("**/Natural-Libraries/**/*.*"),
				vscode.workspace.createFileSystemWatcher("**/build/test-results/**/*.xml"),
				vscode.workspace.createFileSystemWatcher("**/build/stow.log")
			]
		},
		progressOnInitialization: true
	};

	client = new LanguageClient('Natls', serverOptions, clientOptions);
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
}

export async function deactivate() {
	await client.stop();
}
