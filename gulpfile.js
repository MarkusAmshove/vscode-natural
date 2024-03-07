'use strict';
const gulp = require('gulp');
const fse = require('fs-extra');
const fetch = require('node-fetch');
const download = require('gulp-download');
const decompress = require('gulp-decompress');
const {version} = require('./package.json');
const argv = require('yargs').argv

const JAVA_VERSION = '21';

gulp.task('clean-server', function (done) {
	ensureDirectoryDoesntExist('./server');
	done();
});

gulp.task('download-server', gulp.series('clean-server', async function (done) {
	const languageServerVersion = version.substr(0, version.lastIndexOf('.'));
	console.log(`Downloading language server version ${languageServerVersion}`);
	download(`https://github.com/MarkusAmshove/natls/releases/download/v${languageServerVersion}/natls.jar`)
		.pipe(gulp.dest('server/'));
	done();
}));

gulp.task('clean-jre', function (done) {
	ensureDirectoryDoesntExist('./jre');
	done();
});

gulp.task('download-jre', gulp.series('clean-jre', async function (done) {
	const platformMap = {
		'linux': 'linux-x86_64',
		'win32': 'win32-x86_64',
		'darwin': 'macosx-x86_64'
	};

	let platform = argv.platform ?? process.platform;
	console.log(`JRE platform is: ${platform}`);

	const justJManifestUrl = `https://download.eclipse.org/justj/jres/${JAVA_VERSION}/downloads/latest/justj.manifest`;
	const manifest = await (await fetch(justJManifestUrl)).text();

	if (!manifest) {
		done(new Error(`Could not download manifest for URL ${justJManifestUrl}`));
		return;
	}

	const javaPlatform = platformMap[platform];
	const list = manifest.split(/\r?\n/);
	const jreIdentifier = list.find((jreIdentifier) => {
		return jreIdentifier.includes("org.eclipse.justj.openjdk.hotspot.jre.full.stripped")
			&& jreIdentifier.includes(javaPlatform);
	});

	if (!jreIdentifier) {
		done(new Error(`Could not find a JRE for identifier ${jreIdentifier}`));
		return;
	}

	console.log(`Downloading JRE ${jreIdentifier}`);

	const downloadUrl = `https://download.eclipse.org/justj/jres/17/downloads/latest/${jreIdentifier}`;
	download(downloadUrl)
			.pipe(decompress({strip: 0}))
			.pipe(gulp.dest('./jre/'));

	done();
}));

gulp.task('download-all', gulp.series('download-server', 'download-jre'));

function ensureDirectoryDoesntExist(dir) {
	if (!fse.pathExistsSync(dir)) {
		return;
	}
	fse.removeSync(dir);
}
