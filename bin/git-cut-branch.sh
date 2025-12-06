#!/bin/bash

if [[ "x$1" == "x" ]]; then
	echo "Usage: git-cut-branch.sh <branch name>"
    exit 1
fi

echo git checkout -b $1
echo git push origin $1
echo git branch --set-upstream-to=origin/$1
