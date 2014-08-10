PUB_FILES=index.html index.css # bundle.js

build:
	browserify run.js -t es6ify -o bundle.js -d

watch:
	watchify run.js -t es6ify -o bundle.js -d -v

publish:
	# no sourcemaps for "prod"
	mkdir -p pub
	browserify run.js -t es6ify -o pub/bundle.js
	cp $(PUB_FILES) pub
	git checkout gh-pages && mv pub/* . && git commit -a -m "updated pages" && git checkout master
