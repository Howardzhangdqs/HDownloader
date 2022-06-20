const fetch = require("node-fetch");
const fs    = require("fs");
const path  = require("path");
const chalk = require("chalk");
const readline = require('readline');
const progressStream = require('progress-stream');


const rl = require('readline').createInterface({input: process.stdin, output: process.stdout});
const question = (query) => new Promise(resolve => rl.question(query, (answer) => resolve(answer)));

let odata, fdata, cnt = -1, numl;

let config = {
	sync: false,
	batch: 10,
	output: "./",
};

let stat = {
	downloading: 0,
	tot: undefined,
	err: 0,
	finished: 0,
}

let offset = { x: 0, y: 3 };

var deal_filename = function (filenum) {
	let i = filenum;
	let fileURL = fdata[i].url;
	let fileSavePath = path.basename(fileURL).split("?")[0];
	if (fdata[i].name) fileSavePath = fdata[i].name + "." + (fdata[i].suffix ? fdata[i].suffix : fileSavePath.split(".").slice(-1));
	else fileSavePath = path.basename(fileURL).split("?")[0];
	fileSavePath = path.resolve(config.output, fileSavePath);
	let tmpFileSavePath = fileSavePath + ".tmp";
	
	return [fileURL, fileSavePath, tmpFileSavePath];
};

var updstat = function () {
	readline.cursorTo(process.stdout, 0, 1);
	process.stdout.write([
		"总计: " + stat.tot + "项",
		"下载中: " + stat.downloading + "项",
		"已完成: " + stat.finished + "项",
		"剩余: " + (stat.tot - stat.finished) + "项", 
		stat.err ? ("出错: " + chalk.red(stat.err) + "项 ") : "",
	].join(" "));
	if (stat.finished == stat.tot) {
		console.clear(); console.log([
			"完成: " + stat.tot + "项",
			"成功: " + chalk.green(stat.tot - stat.err) + "项",
			"出错: " + chalk.red(stat.err) + "项",
			"\n",
		].join(" ")); process.exit();
	}
}

var downloader = function (filenum) {

	let tfilels = deal_filename(filenum);
	
	let fileURL = tfilels[0], fileSavePath = tfilels[1], tmpFileSavePath = tfilels[2];
	console.log(fileURL, fileSavePath, tmpFileSavePath);
	
	let fileStream = fs.createWriteStream(tmpFileSavePath).on('error', function (e) {
		console.log(chalk.red('Error: '), e);
	}).on('ready', function () {
		console.log(chalk.yellow("文件链接:"), chalk.cyan(fileURL));
		console.log(chalk.yellow("存储位置:"), chalk.cyan(fileSavePath));
	}).on('finish', function () {
		fs.renameSync(tmpFileSavePath, fileSavePath);
		process.stdout.clearLine();
		console.log('文件下载完成:', chalk.green(fileSavePath));
		if (filenum < fdata.length - 1) downloader(filenum + 1);
	});
	
	fetch(fileURL, {
		method: 'GET', headers: { 'Content-Type': 'application/octet-stream' },
	}).then(res => {
		let fsize = res.headers.get("content-length");
		let str = progressStream({ length: fsize, time: 100 });
		let l = fsize ? fsize.toString().length : 0;
		let start_time = + new Date();
		
		str.on('progress', function (pdata) {
			process.stdout.clearLine();
			process.stdout.write([
				"\r",
				"Percentage: " + pdata.percentage.toFixed(2).padStart(5) + "%",
				"Transferred: " + (("" + pdata.transferred).padEnd(l)),
				"Speed: " + (("" + Math.round(pdata.speed)).padEnd(l)),
				"Elapsed: " + ("" + Math.round((+ new Date() - start_time) / 1000 )) + "s",
				"Estimate: " + ("" + Math.round(pdata.remaining / pdata.speed)) + "s",
				"\r",
			].join(" "));
		});
		
		res.body.pipe(str).pipe(fileStream);
	}).catch(e => {
		console.log(e);
	});
};

var downloaderSync = function (filenum, pos) {
	//console.log(filenum);
	if (filenum >= fdata.length) return;

	let tfilels = deal_filename(filenum);
	
	let fileURL = tfilels[0], fileSavePath = tfilels[1], tmpFileSavePath = tfilels[2];
	//console.log(fileURL, fileSavePath, tmpFileSavePath);
	
	let fileStream = fs.createWriteStream(tmpFileSavePath).on('error', function (e) {
		console.log(chalk.red('Error: '), e);
		if (cnt < fdata.length - 1) downloaderSync(++ cnt, pos);
		stat.err ++; updstat();
	}).on('ready', function () {
		//console.log(chalk.yellow("文件链接:"), chalk.cyan(fileURL));
		//console.log(chalk.yellow("存储位置:"), chalk.cyan(fileSavePath));
		stat.downloading ++; updstat();
		readline.cursorTo(process.stdout, offset.x, pos + offset.y);
		process.stdout.clearLine();
	}).on('finish', function () {
		try { fs.renameSync(tmpFileSavePath, fileSavePath) } catch (err) { console.log(err) }
		readline.cursorTo(process.stdout, offset.x, pos + offset.y);
		process.stdout.clearLine();
		console.log('文件下载完成:', chalk.green(fileSavePath));
		if (cnt < fdata.length - 1) downloaderSync(++ cnt, pos);
		stat.downloading --; stat.finished ++; updstat();
	});
	
	fetch(fileURL, {
		method: 'GET', headers: { 'Content-Type': 'application/octet-stream' },
	}).then(res => {
		let fsize = res.headers.get("content-length");
		let str = progressStream({ length: fsize, time: 100 });
		let l = fsize ? fsize.toString().length : 0;
		let start_time = + new Date();
		
		str.on('progress', function (pdata) {
			readline.cursorTo(process.stdout, offset.x, pos + offset.y);
			//process.stdout.clearLine();
			process.stdout.write([
				"\r",
				"Num: " + ("" + filenum).padStart(numl),
				"Percentage: " + pdata.percentage.toFixed(2).padStart(5) + "%",
				"Transferred: " + (("" + pdata.transferred).padEnd(l)),
				"Speed: " + (("" + Math.round(pdata.speed)).padEnd(l)),
				"Elapsed: " + ("" + Math.round((+ new Date() - start_time) / 1000 )) + "s",
				"Estimate: " + ("" + Math.round(pdata.remaining / pdata.speed)) + "s",
				"\r",
			].join(" "));//.padEnd(process.stdout.columns - 1)
		});
		
		res.body.pipe(str).pipe(fileStream);
	}).catch(e => {
		console.log(e);
	});
};

var argv = require('minimist')(process.argv.slice(2));

if (argv.h || argv.help) {
	console.log([
		"usage: hdownloader [path] [options]",
		"       其中 [path] 为 JSON 格式的下载文件列表",
		"",
		"options :",
		"  -o [path]         输出目录位置",
		"  -s --sync         开启单线程下载 (默认值: " + chalk.red(false) + ")",
		"  -b --batch        同时允许并发下载进程的数量 (默认值: " + chalk.cyan("10") + ")",
		"  -h --help         打印此列并退出",
	].join("\n"));
	process.exit();
}

console.clear();

//console.log(argv);

odata = argv._ != [] ? JSON.parse(fs.readFileSync(argv._[0], 'utf-8')) : (function() {
	console.log(chalk.red("无效参数")); process.exit();
})();

if (Object.prototype.toString.call(odata).indexOf("Array")) fdata = odata;
else fdata = odata.data;

config.sync   = argv.sync   || argv.s || odata.sync   || config.sync;
config.batch  = argv.batch  || argv.b || odata.batch  || config.batch;
config.output = argv.output || argv.o || odata.output || config.output;
config.output = path.resolve("", config.output);

fs.mkdirSync(config.output, { recursive: true });

numl = (fdata.length + 1).toString().length;
stat.tot = fdata.length;

console.log(chalk.yellow("输出路径: ") + chalk.cyan(config.output));
console.log(chalk.yellow("下载数量: ") + chalk.cyan(stat.tot));
console.log();

(async () => {
	let q = await question(("回车以开始 (输入 ") + chalk.rgb(97, 214, 214).underline("more") +
			(" 以了解详细信息; ") + chalk.rgb(97, 214, 214).underline("all") + (" 以输出全部下载内容): "));
	
	while (q != "") {
		console.log();
		if (q == "m" || q == "more") {
			console.log(chalk.yellow("是否多线程: ") + (config.sync ? chalk.green("true") : chalk.red("false")));
			console.log(chalk.yellow("并发线程数: ") + chalk.cyan(config.batch));
			console.log(chalk.yellow("输出路径: ") + chalk.cyan(config.output));
		} else if (q == "a" || q == "all") {
			for (let i = 0; i < stat.tot; i ++) {
				let tif = deal_filename(i);
				console.log(chalk.yellow("url: ") + chalk.cyan(tif[0]) +
				chalk.yellow(" 保存路径: ") + chalk.cyan(tif[1]));
			}
		} else console.log(chalk.red("请输入正确的指令"));
		console.log();
		q = await question(("回车以开始 (输入 ") + chalk.rgb(97, 214, 214).underline("more") +
			(" 以了解详细信息; ") + chalk.rgb(97, 214, 214).underline("all") + (" 以输出全部下载内容): "));
	}
	
	console.clear();
	
	if (config.sync) downloader(0);
	else {
		for (let i = 0; i < Math.min(fdata.length, config.batch); i ++) downloaderSync(++ cnt, i);
	}
})();

process.on('SIGINT', () => {
    console.log(chalk.red("\n取消下载\n")); process.exit();
})
/*
process.stdout.on('resize', function() {
	console.log('screen size has changed!');
	console.log(process.stdout.columns + 'x' + process.stdout.rows);
});*/