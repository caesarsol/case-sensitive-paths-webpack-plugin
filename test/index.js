var assert = require("assert");
var fs = require("fs-extra");
var path = require("path");
var webpack = require("webpack");

var CaseSensitivePathsPlugin = require("../");

function webpackCompilerAtDir(dir) {
    return webpack({
        context: path.join(__dirname, "fixtures", dir),
        entry: "./entry",
        output: {
            path: path.join(__dirname, "js"),
            filename: "result.js",
        },
        plugins: [
            new CaseSensitivePathsPlugin()
        ]
    });
}

describe("CaseSensitivePathsPlugin", function() {

    it("should compile and warn on wrong filename case", function(done) {
        var compiler = webpackCompilerAtDir("wrong-case");

        compiler.run(function(err, stats) {
            if (err) done(err);
            assert(stats.hasErrors());
            assert(!stats.hasWarnings());
            var jsonStats = stats.toJson();
            assert.equal(jsonStats.errors.length, 1);

            var error = jsonStats.errors[0];
            // check that the plugin produces the correct output
            assert(error.indexOf('[CaseSensitivePathsPlugin]') !== -1);
            assert(error.indexOf('TestFile.js') !== -1); // wrong file require
            assert(error.indexOf('testfile.js') !== -1); // actual file name

            done();
        });
    });

    it("should handle the deletion of a folder", function(done) {
        var compiler = webpackCompilerAtDir("deleting-folder");

        var testFolder = path.join(__dirname, "fixtures", "deleting-folder", "test-folder");
        var testFile = path.join(testFolder, "testfile.js");

        fs.mkdirSync(testFolder);
        fs.writeFileSync(testFile, "module.exports = '';");

        compiler.run(function (err, stats) {
            if (err) done(err);

            assert(!stats.hasErrors());
            assert(!stats.hasWarnings());

            fs.unlinkSync(testFile);
            fs.rmdirSync(testFolder);

            compiler.run(function (err, stats) {
                if (err) done(err);

                assert(stats.hasErrors());
                assert(!stats.hasWarnings());
                assert.equal(stats.toJson().errors.length, 1);

                done();
            });
        });
    });

    it("should handle the creation of a new file", function(done) {
        var compiler = webpackCompilerAtDir("file-creation");

        var testFile = path.join(__dirname, "fixtures", "file-creation", "testfile.js");
        if (fs.existsSync(testFile)) fs.unlinkSync(testFile);

        let compilationCount = 0
        compiler.watch({}, function(err, stats) {
          if (err) done(err);
          compilationCount++;

          if (compilationCount === 1) {
            assert(stats.hasErrors());
            assert(stats.toJson().errors[0].indexOf('Cannot resolve') !== -1)
            assert(!stats.hasWarnings());

            fs.writeFileSync(testFile, "module.exports = 0;");
          } else if (compilationCount === 2) {
            assert(fs.existsSync(testFile), 'Test file should exist')
            assert(!stats.hasErrors(), 'Should have no errors, but has: \n' + stats.toJson().errors);
            assert(!stats.hasWarnings());
            fs.unlinkSync(testFile);
            done()
          } else {
            throw new Error('Should not reach this point!')
          }
        })
    });

    it("should work with alternate fileSystems", function(done) {
        var called = false;

        var compiler = webpackCompilerAtDir("wrong-case");

        var readdirOriginal = compiler.inputFileSystem.readdir
        compiler.inputFileSystem.readdir = function readdir(p, cb) {
            called = true;
            readdirOriginal.call(this, p, cb);
        }

        compiler.run(function(err, stats) {
            if (err) done(err);
            assert(called, 'should use compiler fs')
            done();
        });
    });
});
