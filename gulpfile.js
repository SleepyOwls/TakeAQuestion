const { src, dest, watch, series, parallel } = require("gulp");
const ts = require("gulp-typescript");
const replace = require('gulp-replace');

const dotenv = require("dotenv");

function compileServer() {
    let tsProjectServer = ts.createProject('tsconfig.json');

    let tsResult = src(["src/**/*.ts", "!src/Client/**/*.ts"])
        .pipe(tsProjectServer());

    return tsResult.js
        .pipe(dest("./out/"));
}

function compileClient() {
    let tsProjectClient = ts.createProject('src/Client/tsconfig.json', { rootDir: process.cwd() });

    let tsResult = src("src/Client/**/*.ts")
        .pipe(tsProjectClient());

    return tsResult.js
        .pipe(replace("import Swal from \"sweetalert2\";", ""))
        .pipe(dest("./res/js/Client/"));
}

function compileUtilsForClient() {
    let tsProjectClient = ts.createProject('src/Client/tsconfig.json', { rootDir: process.cwd() });

    return src("src/Utils/**/*.ts")
        .pipe(tsProjectClient())
        .pipe(dest("./res/js/Utils/"));
}

exports.default = function() {
    dotenv.config();

    if(process.env.DEV_ENV === true) {
        watch(["src/**/*.ts", "!src/Client/**/*.ts"], {ignoreInitial: false}, compileServer);
        watch("src/Client/**/*.ts", {ignoreInitial: false}, compileClient);
        watch("src/Utils/**/*.ts", {ignoreInitial: false}, compileUtilsForClient);
    } else {
        series(compileServer, parallel(compileClient, compileUtilsForClient));
    }
}

// exports.default = series(compileServer, parallel(compileClient, compileUtilsForClient));