#!/usr/bin/env node
var argv = require('../lib/argv');
if (!argv.hub) return console.error('Specify a --hub or set a remote.');

var propagit = require('propagit');
var git = require('../lib/git');

var EventEmitter = require('events').EventEmitter;

var p = propagit(argv);
p.on('error', function (err) {
    console.dir(err);
});

p.hub(function (hub) {
    var opts = {
        drone : argv.drone,
        drones : argv.drones,
        repo : argv.repo || git.repoName(),
        commit : argv.commit,
        command : argv._,
        env : argv.env || {},
        cwd : argv.cwd,
        once : true
    };
    if (!opts.repo) {
        console.error('specify --repo or navigate to a git repo');
        return;
    }
    if (!opts.commit) git.commit(function (err, commit) {
        if (err) {
            console.error(err);
            p.hub.close();
        }
        else {
            opts.commit = commit;
            spawn(hub, opts);
        }
    })
    else spawn(hub, opts);
});

function spawn (hub, opts) {
    var em = new EventEmitter;
    var procs = {};
    var waiting = 1;
    hub.subscribe(em.emit.bind(em));
    em.on('ready', function () {

        hub.execute(opts, function (err, result) {
            if (err) {
                console.error(err);
                p.hub.close();
                return;
            }
            procs[result.id] = result.pid;
            waiting = result.pending;
        });

        em.on('stdout', function (buf, proc) {
            if (procs[proc.drone] !== proc.id) return;
            console.log(
                '[' + proc.drone + '#' + proc.id + '] '
                + buf.replace(/\n$/, '')
            );
        });
        em.on('stderr', function (buf, proc) {
            if (procs[proc.drone] !== proc.id) return;
            console.log(
                '[' + proc.drone + '#' + proc.id + '] '
                + buf.replace(/\n$/, '')
            );
        });

        em.on('exit', function (code, sig, proc) {
            if (procs[proc.drone] !== proc.id) return;
            console.log('(' + proc.drone + '#' + proc.id + ' exited with code ' + code + ')');
            delete procs[proc.drone];
            var pending = Object.keys(procs).length;
            if (waiting === 0 && pending === 0) p.hub.close();
        });
    });
}
