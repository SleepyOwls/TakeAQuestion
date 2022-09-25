const { src, dest, watch, series, parallel } = require("gulp");
const ts = require("gulp-typescript");
const replace = require('gulp-replace');
const terser = require('gulp-terser');

const dotenv = require("dotenv");

let tsProjectServer;
let tsProjectClient;
let tsProjectClientUtils;

// https://gulpjs.com/docs/en/getting-started/async-completion

function compileServer() {
    let tsResult = src(["src/**/*.ts", "!src/Client/**/*.ts"])
        .pipe(tsProjectServer());

    return tsResult.js
        .pipe(terser())
        .pipe(dest("./out/"));
}

function compileClient() {
    let tsResult = src("src/Client/**/*.ts")
        .pipe(tsProjectClient());

    return tsResult.js
        .pipe(replace("import Swal from \"sweetalert2\";", "")) // Remove import statement from all files so we don't get errors as it gets loaded by in the HTML file
        .pipe(terser())
        .pipe(dest("./res/js/Client/"));
}

function compileUtilsForClient() {
    return src("src/Utils/**/*.ts")
        .pipe(tsProjectClientUtils())
        .pipe(terser())
        .pipe(dest("./res/js/Utils/"));
}

exports.default = function() {
    dotenv.config();

    tsProjectServer = ts.createProject('tsconfig.json');
    tsProjectClient = ts.createProject('src/Client/tsconfig.json', { rootDir: process.cwd() });
    tsProjectClientUtils = ts.createProject('src/Client/tsconfig.json', { rootDir: process.cwd() });

    if(process.env.DEV_ENV === "true") {
        watch(["src/**/*.ts", "!src/Client/**/*.ts"], {ignoreInitial: false}, compileServer);
        watch("src/Client/**/*.ts", {ignoreInitial: false}, compileClient);
        watch("src/Utils/**/*.ts", {ignoreInitial: false}, compileUtilsForClient);
    } else {
        series(compileServer, parallel(compileClient, compileUtilsForClient));
    }
}