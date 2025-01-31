import fs from "fs";
import fetch from "node-fetch";
import * as tar from "tar";
import yargs from "yargs/yargs";

const JAVA_VERSION = "21";
const JAVA_PLATFORM = {
	"linux": "linux-x86_64",
	"win32": "win32-x86_64",
	"darwin": "macosx-x86_64",
	"darwin_arm64": "macosx-aarch64.tar.gz"
};
const JRE_DOWNLOAD_TARGET = "./jre/";
const SERVER_DOWNLOAD_TARGET = "./server/";


function cleanJRE() {
	console.log("Removing", JRE_DOWNLOAD_TARGET);

	if (!fs.existsSync(JRE_DOWNLOAD_TARGET)) {
		return;
	}

	fs.rmdirSync(JRE_DOWNLOAD_TARGET, { recursive: true });
}

async function downloadJRE(javaVersion, javaPlatform) {
	console.log("Downloading JRE for version", javaVersion, "and platform", javaPlatform);
	const justJManifestUrl = `https://download.eclipse.org/justj/jres/${javaVersion}/downloads/latest/justj.manifest`;
	const manifestResponse = await fetch(justJManifestUrl);
	if (!manifestResponse.ok) {
		throw new Error(`Could not request manifest: HTTP for ${manifestResponse.status} - ${justJManifestUrl}`);
	}

	const manifest = await manifestResponse.text();
	const urlList = manifest.split(/\r?\n/);
	const jreIdentifier = urlList.find((jreIdentifier) => {
		return jreIdentifier.includes("org.eclipse.justj.openjdk.hotspot.jre.full.stripped")
			&& jreIdentifier.includes(javaPlatform);
	});

	if (!jreIdentifier) {
		throw new Error(`Coult not find a JRE for platform ${javaPlatform} in list ${urlList}`);
	}

	const downloadUrl = `https://download.eclipse.org/justj/jres/${javaVersion}/downloads/latest/${jreIdentifier}`;
	console.log("Downloading JRE from subpath", downloadUrl);

	if (!fs.existsSync(JRE_DOWNLOAD_TARGET)) {
		fs.mkdirSync(JRE_DOWNLOAD_TARGET);
	}

	const jreResponse = await fetch(downloadUrl);
	if (!jreResponse.ok) {
		throw new Error(`Got HTTP ${jreResponse.status} while downloading JRE from ${downloadUrl}`);
	}

	console.log("Extracting JRE to", JRE_DOWNLOAD_TARGET);
	await new Promise((resolve, reject) => {
		const extract = jreResponse.body
			.pipe(
				tar.x({
					strip: 0,
					cwd: JRE_DOWNLOAD_TARGET,
				})
			);
		extract.on("end", resolve);
		extract.on("error", reject);
	});

	console.log("Done");
}

function cleanServer() {
	console.log("Removing", SERVER_DOWNLOAD_TARGET);
	if (!fs.existsSync(SERVER_DOWNLOAD_TARGET)) {
		return;
	}

	fs.rmdirSync(SERVER_DOWNLOAD_TARGET, { recursive: true });
}

async function downloadServer() {
	console.log("Downloading latest language server");

	if (!fs.existsSync(SERVER_DOWNLOAD_TARGET)) {
		fs.mkdirSync(SERVER_DOWNLOAD_TARGET);
	}

	const version = JSON.parse(fs.readFileSync("package.json")).version;

	const languageServerVersion = version.substr(0, version.lastIndexOf("."));
	const serverUrl = `https://github.com/MarkusAmshove/natls/releases/download/v${languageServerVersion}/natls.jar`;

	console.log("Downloading Server from", serverUrl);

	const response = await fetch(serverUrl);
	if (!response.ok) {
		throw new Error(`Got HTTP ${response.status} while downloading Server`);
	}

	const fileStream = fs.createWriteStream(SERVER_DOWNLOAD_TARGET + "natls.jar");
	await new Promise((resolve, reject) => {
		response.body.pipe(fileStream);
		response.body.on("error", reject);
		fileStream.on("finish", resolve);
	});

	console.log("Done");
}

function getCurrentPlatformIdentifier() {
	const currentPlatform = process.platform;
	if (currentPlatform !== "darwin") {
		return currentPlatform;
	}

	if (process.arch === "arm64") {
		return "darwin_arm64";
	}

	return currentPlatform;
}

const argv = yargs(process.argv.slice(2)).argv;

const javaVersion = argv.java ?? JAVA_VERSION;
const platform = argv.platform ?? getCurrentPlatformIdentifier();
const javaPlatform = JAVA_PLATFORM[platform];

if (!javaPlatform) {
	console.log("No Java platform found for", platform);
	console.log("Possible platforms:", Object.keys(JAVA_PLATFORM));
	process.exit(1);
}

const shouldDownloadAll = process.argv.includes("download-all");
const shouldDownloadJRE = process.argv.includes("download-jre") || shouldDownloadAll;
const shouldCleanJRE = process.argv.includes("clean-jre") || shouldDownloadJRE;
const shouldDownloadServer = process.argv.includes("download-server") || shouldDownloadAll;
const shouldCleanServer = process.argv.includes("clean-server") || shouldDownloadServer;

let commandFound = false;

if (shouldCleanJRE) {
	commandFound = true;
	cleanJRE();
}

if (shouldDownloadJRE) {
	commandFound = true;
	await downloadJRE(javaVersion, javaPlatform);
}

if (shouldCleanServer) {
	commandFound = true;
	cleanServer();
}

if (shouldDownloadServer) {
	commandFound = true;
	await downloadServer();
}

if (!commandFound) {
	console.log("No command provided. Use one of:");
	console.log("  clean-jre: Removes JRE download directory");
	console.log("  download-jre: Downloads JRE");
	console.log("  clean-server: Removes language server directory");
	console.log("  download-server: Downloads latest language server");
	process.exit(1);
}

