#!/usr/bin/env bash

current_dir=$(cd $(dirname $0) && pwd)
secret='vier'
tmpdir=/tmp/$(node -e '(Math.random()*Math.pow(2,32)).toString(16)' -p)

on_die()
{
        echo "INFO [$(date)]: Signal received. Removing ${tmpdir}"
        rm -rf ${tmpdir}
        exit
}

# setting signal handler, to kill the child, if SIGTERM or SIGINT is received
trap on_die INT TERM EXIT

echo $tmpdir
mkdir -p $tmpdir/hub
mkdir -p $tmpdir/drone0
mkdir -p $tmpdir/drone1

cd $tmpdir/hub
${current_dir}/../../bin/hub.js --secret="$secret" --port=7000 &

echo hub listening on :7000

cd $tmpdir/drone0
${current_dir}/../../bin/drone.js --secret="$secret" --hub=localhost:7000 &

cd $tmpdir/drone1
${current_dir}/../../bin/drone.js --secret="$secret" --hub=localhost:7000 &

${current_dir}/../../bin/monitor.js --secret="$secret" --hub=localhost:7000
